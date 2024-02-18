import { Storage } from "..";
import { TasksContract } from "../contracts/Tasks";
import { SubmissionCreated } from "../types/task-events";
import { ContractWatcher } from "../utils/contract-watcher";
import { fetchMetadata } from "../utils/metadata-fetch";
import { addEvent, createSubmissionIfNotExists } from "./taskHelpers";

export function watchSubmissionCreated(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("SubmissionCreated", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "SubmissionCreated",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "SubmissionCreated",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as SubmissionCreated;

          await processSubmissionCreated(event, storage);
        })
      );
    },
  });
}

export async function processSubmissionCreated(event: SubmissionCreated, storage: Storage): Promise<void> {
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event) - 1;
  });

  const taskId = event.taskId.toString();
  await storage.tasks.update((tasks) => {
    createSubmissionIfNotExists(tasks, event.chainId, taskId, event.submissionId);
    const task = tasks[event.chainId][taskId];
    const submission = task.submissions[event.submissionId];
    submission.metadata = event.metadata;

    addEvent(task, taskEvent);
  });

  await fetchMetadata(event.metadata)
    .then((metadata) =>
      storage.tasks.update((tasks) => {
        tasks[event.chainId][taskId].submissions[event.submissionId].cachedMetadata = metadata;
      })
    )
    .catch((err) => console.error(`Error while fetching submission metadata ${event.metadata} (${event.chainId}-${taskId}): ${JSON.stringify(err)}`));
}
