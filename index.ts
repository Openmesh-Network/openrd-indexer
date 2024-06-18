import { config as loadEnv } from "dotenv";
import express, { application } from "express";
import storageManager from "node-persist";
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
import { MultichainWatcher } from "./utils/multichain-watcher.js";
import { PersistentJson } from "./utils/persistent-json.js";
import { watchRewardIncreased } from "./event-watchers/RewardIncreased.js";
import { watchDisputeCreated } from "./event-watchers/extensions/DisputeCreated.js";
import { watchDraftCreated } from "./event-watchers/extensions/DraftCreated.js";
import { watchRFPCreated } from "./event-watchers/rfps/RFPCreated.js";
import { watchRFPEmptied } from "./event-watchers/rfps/RFPEmptied.js";
import { watchProjectSubmitted } from "./event-watchers/rfps/ProjectSubmitted.js";
import { watchProjectAccepted } from "./event-watchers/rfps/ProjectAccepted.js";
import { DisputesStorage, DraftsStorage, RFPsEventsStorage, RFPsStorage, TasksEventsStorage, TasksStorage, UsersStorage } from "./types/storage.js";
import { historySync } from "./utils/history-sync.js";
import axios from "axios";
import { UserReturn } from "./api/return-types.js";
import { Address } from "viem";
import { TasksContract } from "./contracts/Tasks.js";
import { RFPsContract } from "./contracts/RFPs.js";
import { TaskDisputesContract } from "./contracts/TaskDisputes.js";
import { TaskDraftsContract } from "./contracts/TaskDrafts.js";
import { fetchMetadata } from "./utils/metadata-fetch.js";
import { getPrice } from "./utils/get-token-price.js";
import { chains } from "./utils/chain-cache.js";

async function start() {
  const loadEnvResult = loadEnv();
  if (loadEnvResult.error) {
    console.warn(`Error while loading .env: ${loadEnvResult.error}`);
  }

  // Make contract watcher for each chain (using Infura provider)
  const multichainWatcher = new MultichainWatcher([
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
    // {
    //   chain: arbitrumSepolia,
    //   rpc: `arbitrum-sepolia.infura.io/ws/v3/${process.env.INFURA_API_KEY}`,
    // },
  ]);

  // Data (memory + json files (synced) currently, could be migrated to a database solution if needed in the future)
  await storageManager.init({ dir: "storage" });
  const storage = {
    tasks: new PersistentJson<TasksStorage>("tasks", {}),
    tasksEvents: new PersistentJson<TasksEventsStorage>("tasksEvents", {}),
    users: new PersistentJson<UsersStorage>("users", {}),

    disputes: new PersistentJson<DisputesStorage>("disputes", {}),
    drafts: new PersistentJson<DraftsStorage>("drafts", {}),

    rfps: new PersistentJson<RFPsStorage>("rfps", {}),
    rfpsEvents: new PersistentJson<RFPsEventsStorage>("rfpsEvents", {}),
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

  let isStopping = false;
  process.on("SIGINT", async () => {
    if (isStopping) {
      // Sigint can be fired multiple times
      return;
    }
    isStopping = true;
    console.log("Stopping...");

    multichainWatcher.forEach((contractWatcher) => {
      contractWatcher.stopAll();
    });
    await Promise.all(
      Object.values(storage).map((storageItem) => {
        return storageItem.update(() => {}); // Save all memory values to disk
      })
    );
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

  process.stdin.resume();

  process.stdin.on("data", (input) => {
    try {
      const command = input.toString();
      if (command.startsWith("sync ")) {
        // In case some event logs were missed
        const args = command.split(" ").slice(1);
        const chainId = Number(args[0]);
        const fromBlock = BigInt(args[1]);
        const toBlock = BigInt(args[2]);
        historySync(multichainWatcher, chainId, fromBlock, toBlock, [
          TasksContract.address,
          RFPsContract.address,
          TaskDisputesContract.address,
          TaskDraftsContract.address,
        ]).catch((err) => console.error(`Error while executing history sync: ${err}`));
      }
      if (command.startsWith("refetch ")) {
        // In case some information is outdated
        const args = command.split(" ").slice(1);
        const chainId = Number(args[0]);
        const taskId = Number(args[1]);
        storage.tasks
          .get()
          .then(async (tasks) => {
            const task = tasks[chainId][taskId];
            if (!task.cachedMetadata) {
              console.log("Refetching metadata");
              const metadata = await fetchMetadata(task.metadata);
              await storage.tasks.update((tasks) => {
                tasks[chainId][taskId].cachedMetadata = metadata;
              });
            }
            if (task.usdValue === 0) {
              console.log("Refetching usd value");
              const usdValue = await getPrice(chains[chainId], task.nativeBudget, task.budget);
              await storage.tasks.update((tasks) => {
                tasks[chainId][taskId].usdValue = usdValue;
              });
            }
            await Promise.all(
              Object.keys(task.applications).map(async (applicationId) => {
                const application = task.applications[applicationId as any as number];
                if (!application.cachedMetadata) {
                  console.log(`Refetching metadata of application ${applicationId}`);
                  const metadata = await fetchMetadata(application.metadata);
                  await storage.tasks.update((tasks) => {
                    tasks[chainId][taskId].applications[applicationId as any as number].cachedMetadata = metadata;
                  });
                }
              })
            );
            await Promise.all(
              Object.keys(task.submissions).map(async (submissionId) => {
                const submission = task.submissions[submissionId as any as number];
                if (!submission.cachedMetadata) {
                  console.log(`Refetching metadata of submission ${submissionId}`);
                  const metadata = await fetchMetadata(submission.metadata);
                  await storage.tasks.update((tasks) => {
                    tasks[chainId][taskId].submissions[submissionId as any as number].cachedMetadata = metadata;
                  });
                }
              })
            );
          })
          .then(() => console.log("Refetch finished!"))
          .catch((err) => console.error(`Error while executing refetch: ${err}`));
      }
      if (command.startsWith("syncUserMetadata")) {
        // Download user metadata from remote
        const remote = "https://openrd.plopmenz.com/indexer/user/";
        console.log(`Syncing user metadata from ${remote}...`);
        storage.users
          .get()
          .then(async (users) => {
            const addresses = Object.keys(users);
            const metadata = await Promise.all(
              addresses.map(
                (address) =>
                  axios
                    .get(remote + address)
                    .then((response) => response.data as UserReturn)
                    .then((user) => user.metadata)
                    .catch(() => "") // Assumed user not found error, meaning they have no metadata
              )
            );
            return addresses.map((address, i) => {
              return { address: address as Address, metadata: metadata[i] };
            });
          })
          .then(async (userInfo) => {
            await storage.users.update((users) => {
              for (let i = 0; i < userInfo.length; i++) {
                users[userInfo[i].address].metadata = userInfo[i].metadata;
              }
            });
          })
          .then(() => console.log("Sync finished!"))
          .catch((err) => console.error(`Error while executing user metadata sync: ${err}`));
      }
    } catch (err) {
      console.error(`Error interpreting command: ${err}`);
    }
  });
}

start().catch(console.error);
