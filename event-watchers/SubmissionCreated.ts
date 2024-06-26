import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { SubmissionCreated } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { fetchMetadata } from "../utils/metadata-fetch.js";
import { addEvent, createSubmissionIfNotExists } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchSubmissionCreated(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("SubmissionCreated", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "SubmissionCreated",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "SubmissionCreated",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as SubmissionCreated;

          await processSubmissionCreated(event, storage);
        })
      );
    },
  });
}

export async function processSubmissionCreated(event: SubmissionCreated, storage: Storage): Promise<void> {
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
    createSubmissionIfNotExists(tasks, event.chainId, taskId, event.submissionId);
    const task = tasks[event.chainId][taskId];
    const submission = task.submissions[event.submissionId];
    submission.metadata = event.metadata;

    addEvent(task, event);
  });

  await fetchMetadata(event.metadata)
    .then((metadata) =>
      storage.tasks.update((tasks) => {
        tasks[event.chainId][taskId].submissions[event.submissionId].cachedMetadata = metadata;
      })
    )
    .catch((err) => console.error(`Error while fetching submission metadata ${event.metadata} (${event.chainId}-${taskId}): ${err}`));
}
