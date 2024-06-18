import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { SubmissionReviewed } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { fetchMetadata } from "../utils/metadata-fetch.js";
import { addEvent, createSubmissionIfNotExists } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchSubmissionReviewed(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("SubmissionReviewed", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "SubmissionReviewed",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "SubmissionReviewed",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as SubmissionReviewed;

          await processSubmissionReviewed(event, storage);
        })
      );
    },
  });
}

export async function processSubmissionReviewed(event: SubmissionReviewed, storage: Storage): Promise<void> {
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
    submission.judgement = event.judgement;
    submission.feedback = event.feedback;

    addEvent(task, event);
  });

  await fetchMetadata(event.feedback)
    .then((metadata) =>
      storage.tasks.update((tasks) => {
        tasks[event.chainId][taskId].submissions[event.submissionId].cachedFeedback = metadata;
      })
    )
    .catch((err) => console.error(`Error while fetching application feedback metadata ${event.feedback} (${event.chainId}-${taskId}): ${err}`));
}
