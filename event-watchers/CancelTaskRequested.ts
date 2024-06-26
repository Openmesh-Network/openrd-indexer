import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { CancelTaskRequested } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { fetchMetadata } from "../utils/metadata-fetch.js";
import { addEvent, createCancelTaskRequestIfNotExists } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchCancelTaskRequested(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("CancelTaskRequested", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "CancelTaskRequested",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "CancelTaskRequested",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as CancelTaskRequested;

          await processCancelTaskRequested(event, storage);
        })
      );
    },
  });
}

export async function processCancelTaskRequested(event: CancelTaskRequested, storage: Storage): Promise<void> {
  let alreadyProcessed = false;
  await storage.tasksEvents.update((tasksEvents) => {
    if (tasksEvents[event.chainId]?.[event.transactionHash]?.[event.logIndex] !== undefined) {
      alreadyProcessed = true;
      return;
    }
    addTaskEvent(tasksEvents, event);
  });
  if (alreadyProcessed) {
    return;
  }

  const taskId = event.taskId.toString();
  await storage.tasks.update((tasks) => {
    createCancelTaskRequestIfNotExists(tasks, event.chainId, taskId, event.requestId);
    const task = tasks[event.chainId][taskId];
    const request = task.cancelTaskRequests[event.requestId];
    request.metadata = event.metadata;

    addEvent(task, event);
  });

  await fetchMetadata(event.metadata)
    .then((metadata) =>
      storage.tasks.update((tasks) => {
        tasks[event.chainId][taskId].cancelTaskRequests[event.requestId].cachedMetadata = metadata;
      })
    )
    .catch((err) => console.error(`Error while fetching metadata ${event.metadata} (${event.chainId}-${taskId}): ${err}`));
}
