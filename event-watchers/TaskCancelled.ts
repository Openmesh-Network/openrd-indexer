import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { TaskCancelled } from "../types/task-events.js";
import { TaskState } from "../types/tasks.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, createTaskIfNotExists } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchTaskCancelled(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("TaskCancelled", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "TaskCancelled",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "TaskCancelled",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as TaskCancelled;

          await processTaskCancelled(event, storage);
        })
      );
    },
  });
}

export async function processTaskCancelled(event: TaskCancelled, storage: Storage): Promise<void> {
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
    task.state = TaskState.Closed;
    // Closed with no source means cancelled

    addEvent(task, event);
  });
}
