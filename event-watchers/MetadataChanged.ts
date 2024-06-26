import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { MetadataChanged } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { fetchMetadata } from "../utils/metadata-fetch.js";
import { addEvent, createTaskIfNotExists } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchMetadataChanged(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("MetadataChanged", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "MetadataChanged",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "MetadataChanged",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as MetadataChanged;

          await processMetadataChanged(event, storage);
        })
      );
    },
  });
}

export async function processMetadataChanged(event: MetadataChanged, storage: Storage): Promise<void> {
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
    createTaskIfNotExists(tasks, event.chainId, taskId);
    const task = tasks[event.chainId][taskId];
    task.metadata = event.newMetadata;

    addEvent(task, event);
  });

  await fetchMetadata(event.newMetadata)
    .then((metadata) =>
      storage.tasks.update((tasks) => {
        tasks[event.chainId][taskId].cachedMetadata = metadata;
      })
    )
    .catch((err) => console.error(`Error while fetching task new metadata ${event.newMetadata} (${event.chainId}-${taskId}): ${err}`));
}
