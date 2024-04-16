import { config as loadEnv } from "dotenv";
import express from "express";
import storageManager from "node-persist";
import { Address } from "viem";
import { arbitrumSepolia, mainnet, polygon, sepolia } from "viem/chains";

import { registerRoutes } from "./api/simple-router.js";
import { watchApplicationAccepted } from "./event-watchers/ApplicationAccepted.js";
import { watchApplicationCreated } from "./event-watchers/ApplicationCreated.js";
import { watchBudgetChanged } from "./event-watchers/BudgetChanged.js";
import { watchCancelTaskRequested } from "./event-watchers/CancelTaskRequested.js";
import { watchDeadlineChanged } from "./event-watchers/DeadlineChanged.js";
import { watchManagerChanged } from "./event-watchers/ManagerChanged.js";
import { watchMetadataChanged } from "./event-watchers/MetadataChanged.js";
import { watchPartialPayment } from "./event-watchers/PartialPayment.js";
import { watchRequestAccepted } from "./event-watchers/RequestAccepted.js";
import { watchRequestExecuted } from "./event-watchers/RequestExecuted.js";
import { watchSubmissionCreated } from "./event-watchers/SubmissionCreated.js";
import { watchSubmissionReviewed } from "./event-watchers/SubmissionReviewed.js";
import { watchTaskCancelled } from "./event-watchers/TaskCancelled.js";
import { watchTaskCompleted } from "./event-watchers/TaskCompleted.js";
import { watchTaskCreated } from "./event-watchers/TaskCreated.js";
import { watchTaskTaken } from "./event-watchers/TaskTaken.js";
import { TaskEvent } from "./types/task-events.js";
import { IndexedDispute, IndexedDraft, IndexedTask } from "./types/tasks.js";
import { User } from "./types/user.js";
import { MultischainWatcher } from "./utils/multichain-watcher.js";
import { PersistentJson } from "./utils/persistent-json.js";
import { watchRewardIncreased } from "./event-watchers/RewardIncreased.js";
import { watchDisputeCreated } from "./event-watchers/extensions/DisputeCreated.js";
import { IndexedRFP } from "./types/rfp.js";
import { RFPEvent } from "./types/rfp-events.js";
import { watchDraftCreated } from "./event-watchers/extensions/DraftCreated.js";
import { watchRFPCreated } from "./event-watchers/rfps/RFPCreated.js";
import { watchRFPEmptied } from "./event-watchers/rfps/RFPEmptied.js";
import { watchProjectSubmitted } from "./event-watchers/rfps/ProjectSubmitted.js";
import { watchProjectAccepted } from "./event-watchers/rfps/ProjectAccepted.js";

export interface TasksStorage {
  [chainId: number]: {
    [taskId: string]: IndexedTask;
  };
}
export type TasksEventsStorage = TaskEvent[];
export interface UsersStorage {
  [address: Address]: User;
}

export interface DisputesStorage {
  [chainId: number]: {
    [taskId: string]: IndexedDispute[];
  };
}
export interface DraftsStorage {
  [chainId: number]: {
    [dao: Address]: IndexedDraft[];
  };
}

export interface RFPsStorage {
  [chainId: number]: {
    [rfpId: string]: IndexedRFP;
  };
}
export type RFPsEventsStorage = RFPEvent[];

export interface Storage {
  tasks: PersistentJson<TasksStorage>;
  tasksEvents: PersistentJson<TasksEventsStorage>;
  users: PersistentJson<UsersStorage>;

  disputes: PersistentJson<DisputesStorage>;
  drafts: PersistentJson<DraftsStorage>;

  rfps: PersistentJson<RFPsStorage>;
  rfpsEvents: PersistentJson<RFPsEventsStorage>;
}

async function start() {
  const loadEnvResult = loadEnv();
  if (loadEnvResult.error) {
    console.warn(`Error while loading .env: ${loadEnvResult.error}`);
  }

  // Make contract watcher for each chain (using Infura provider)
  const multichainWatcher = new MultischainWatcher([
    {
      chain: mainnet,
      rpc: `mainnet.infura.io/ws/v3/${process.env.INFURA_API_KEY}`,
    },
    {
      chain: sepolia,
      rpc: `sepolia.infura.io/ws/v3/${process.env.INFURA_API_KEY}`,
    },
    {
      chain: polygon,
      rpc: `polygon-mainnet.infura.io/ws/v3/${process.env.INFURA_API_KEY}`,
    },
    {
      chain: arbitrumSepolia,
      rpc: `arbitrum-sepolia.infura.io/ws/v3/${process.env.INFURA_API_KEY}`,
    },
  ]);

  // Data (memory + json files (synced) currently, could be migrated to a database solution if needed in the future)
  await storageManager.init({ dir: "storage" });
  const storage = {
    tasks: new PersistentJson<TasksStorage>("tasks", {}),
    tasksEvents: new PersistentJson<TasksEventsStorage>("tasksEvents", []),
    users: new PersistentJson<UsersStorage>("users", {}),

    disputes: new PersistentJson<DisputesStorage>("disputes", {}),
    drafts: new PersistentJson<DraftsStorage>("drafts", {}),

    rfps: new PersistentJson<RFPsStorage>("rfps", {}),
    rfpsEvents: new PersistentJson<RFPsEventsStorage>("rfpsEvents", []),
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
    watchRewardIncreased(contractWatcher, storage);
    watchMetadataChanged(contractWatcher, storage);
    watchManagerChanged(contractWatcher, storage);
    watchPartialPayment(contractWatcher, storage);

    watchDisputeCreated(contractWatcher, storage);
    watchDraftCreated(contractWatcher, storage);

    watchRFPCreated(contractWatcher, storage);
    watchProjectSubmitted(contractWatcher, storage);
    watchProjectAccepted(contractWatcher, storage);
    watchRFPEmptied(contractWatcher, storage);
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

  var server = app.listen(process.env.PORT ?? 3001, () => {
    const addressInfo = server.address() as any;
    var host = addressInfo.address;
    var port = addressInfo.port;
    console.log(`Webserver started on ${host}:${port}`);
  });
}

start().catch(console.error);
