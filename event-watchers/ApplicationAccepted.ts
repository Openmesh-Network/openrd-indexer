import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { ApplicationAccepted } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, createApplicationIfNotExists } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchApplicationAccepted(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("ApplicationAccepted", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "ApplicationAccepted",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "ApplicationAccepted",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as ApplicationAccepted;

          await processApplicationAccepted(event, storage);
        })
      );
    },
  });
}

export async function processApplicationAccepted(event: ApplicationAccepted, storage: Storage): Promise<void> {
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
    createApplicationIfNotExists(tasks, event.chainId, taskId, event.applicationId);
    const task = tasks[event.chainId][taskId];
    const application = task.applications[event.applicationId];
    application.accepted = true;

    addEvent(task, event);
  });
}
