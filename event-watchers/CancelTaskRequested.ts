import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { CancelTaskRequested } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { fetchMetadata } from "../utils/metadata-fetch.js";
import { addEvent, createCancelTaskRequestIfNotExists } from "./taskHelpers.js";

export function watchCancelTaskRequested(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("CancelTaskRequested", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "CancelTaskRequested",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "CancelTaskRequested",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as CancelTaskRequested;

          await processCancelTaskRequested(event, storage);
        })
      );
    },
  });
}

export async function processCancelTaskRequested(event: CancelTaskRequested, storage: Storage): Promise<void> {
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event) - 1;
  });

  const taskId = event.taskId.toString();
  await storage.tasks.update((tasks) => {
    createCancelTaskRequestIfNotExists(tasks, event.chainId, taskId, event.requestId);
    const task = tasks[event.chainId][taskId];
    const request = task.cancelTaskRequests[event.requestId];
    request.metadata = event.metadata;

    addEvent(task, taskEvent);
  });

  await fetchMetadata(event.metadata)
    .then((metadata) =>
      storage.tasks.update((tasks) => {
        tasks[event.chainId][taskId].cancelTaskRequests[event.requestId].cachedMetadata = metadata;
      })
    )
    .catch((err) => console.error(`Error while fetching metadata ${event.metadata} (${event.chainId}-${taskId}): ${err}`));
}
