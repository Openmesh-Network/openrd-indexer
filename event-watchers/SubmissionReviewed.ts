import { Storage } from "..";
import { TasksContract } from "../contracts/Tasks";
import { SubmissionReviewed } from "../types/task-events";
import { ContractWatcher } from "../utils/contract-watcher";
import { fetchMetadata } from "../utils/metadata-fetch";
import { createSubmissionIfNotExists } from "./taskHelpers";

export function watchSubmissionReviewed(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("SubmissionReviewed", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "SubmissionReviewed",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "SubmissionReviewed",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as SubmissionReviewed;

          await processSubmissionReviewed(event, storage);
        })
      );
    },
  });
}

export async function processSubmissionReviewed(event: SubmissionReviewed, storage: Storage): Promise<void> {
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event) - 1;
  });

  const taskId = event.taskId.toString();
  await storage.tasks.update((tasks) => {
    createSubmissionIfNotExists(tasks, event.chainId, taskId, event.submissionId);
    const task = tasks[event.chainId][taskId];
    const submission = task.submissions[event.submissionId];
    submission.judgement = event.judgement;
    submission.feedback = event.feedback;

    task.events.push(taskEvent);
  });

  await fetchMetadata(event.feedback)
    .then((metadata) =>
      storage.tasks.update((tasks) => {
        tasks[event.chainId][taskId].submissions[event.submissionId].cachedMetadata = metadata;
      })
    )
    .catch((err) => console.error(`Error while fetching application feedback metadata ${event.feedback} (${event.chainId}-${taskId}): ${JSON.stringify(err)}`));
}
