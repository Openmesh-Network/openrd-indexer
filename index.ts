import { config as loadEnv } from "dotenv";
import express from "express";
import storageManager from "node-persist";
import { Address } from "viem";
import { mainnet, polygon, polygonMumbai, sepolia } from "viem/chains";

import { registerRoutes } from "./api/simple-router";
import { watchApplicationAccepted } from "./event-watchers/ApplicationAccepted";
import { watchApplicationCreated } from "./event-watchers/ApplicationCreated";
import { watchBudgetChanged } from "./event-watchers/BudgetChanged";
import { watchCancelTaskRequested } from "./event-watchers/CancelTaskRequested";
import { watchDeadlineChanged } from "./event-watchers/DeadlineChanged";
import { watchManagerChanged } from "./event-watchers/ManagerChanged";
import { watchMetadataChanged } from "./event-watchers/MetadataChanged";
import { watchPartialPayment } from "./event-watchers/PartialPayment";
import { watchRequestAccepted } from "./event-watchers/RequestAccepted";
import { watchRequestExecuted } from "./event-watchers/RequestExecuted";
import { watchSubmissionCreated } from "./event-watchers/SubmissionCreated";
import { watchSubmissionReviewed } from "./event-watchers/SubmissionReviewed";
import { watchTaskCancelled } from "./event-watchers/TaskCancelled";
import { watchTaskCompleted } from "./event-watchers/TaskCompleted";
import { watchTaskCreated } from "./event-watchers/TaskCreated";
import { watchTaskTaken } from "./event-watchers/TaskTaken";
import { TaskEvent } from "./types/task-events";
import { IndexedTask } from "./types/tasks";
import { User } from "./types/user";
import { MultischainWatcher } from "./utils/multichain-watcher";
import { PersistentJson } from "./utils/persistent-json";

export interface TasksStorage {
  [chainId: number]: {
    [taskId: string]: IndexedTask;
  };
}
export type TasksEventsStorage = TaskEvent[];
export interface UsersStorage {
  [address: Address]: User;
}
export interface Storage {
  tasks: PersistentJson<TasksStorage>;
  tasksEvents: PersistentJson<TasksEventsStorage>;
  users: PersistentJson<UsersStorage>;
}

async function start() {
  const loadEnvResult = loadEnv();
  if (loadEnvResult.error) {
    console.warn(`Error while loading .env: ${JSON.stringify(loadEnvResult.error)}`);
  }

  // Make contract watcher for each chain (using Infura provider)
  const multichainWatcher = new MultischainWatcher([
    {
      chain: mainnet,
      infuraPrefix: "mainnet",
    },
    {
      chain: sepolia,
      infuraPrefix: "sepolia",
    },
    {
      chain: polygon,
      infuraPrefix: "polygon-mainnet",
    },
    {
      chain: polygonMumbai,
      infuraPrefix: "polygon-mumbai",
    },
  ]);

  // Data (memory + json files (synced) currently, could be migrated to a database solution if needed in the future)
  await storageManager.init({ dir: "storage" });
  const storage = {
    tasks: new PersistentJson<TasksStorage>("tasks", {}),
    tasksEvents: new PersistentJson<TasksEventsStorage>("tasksEvents", []),
    users: new PersistentJson<UsersStorage>("users", {}),
  };

  multichainWatcher.forEach((contractWatcher) => {
    watchTaskCreated(contractWatcher, storage);
    watchApplicationCreated(contractWatcher, storage);
    watchApplicationAccepted(contractWatcher, storage);
    watchTaskTaken(contractWatcher, storage);
    watchSubmissionCreated(contractWatcher, storage);
    watchSubmissionReviewed(contractWatcher, storage);
    watchTaskCompleted(contractWatcher, storage);

    watchCancelTaskRequested(contractWatcher, storage);
    watchTaskCancelled(contractWatcher, storage);
    watchRequestAccepted(contractWatcher, storage);
    watchRequestExecuted(contractWatcher, storage);

    watchDeadlineChanged(contractWatcher, storage);
    watchBudgetChanged(contractWatcher, storage);
    watchMetadataChanged(contractWatcher, storage);
    watchManagerChanged(contractWatcher, storage);
    watchPartialPayment(contractWatcher, storage);
  });

  process.on("SIGINT", function () {
    console.log("Stopping...");

    multichainWatcher.forEach((contractWatcher) => {
      contractWatcher.stopAll();
    });
    process.exit();
  });

  // Webserver
  const app = express();
  registerRoutes(app, storage);

  var server = app.listen(3001, () => {
    const addressInfo = server.address() as any;
    var host = addressInfo.address;
    var port = addressInfo.port;
    console.log(`Webserver started on ${host}:${port}`);
  });
}

start().catch(console.error);
