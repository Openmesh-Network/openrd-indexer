import { Storage } from "..";
import { TasksContract } from "../contracts/Tasks.js";
import { TaskCancelled } from "../types/task-events.js";
import { TaskState } from "../types/tasks.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, createTaskIfNotExists } from "./taskHelpers.js";

export function watchTaskCancelled(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("TaskCancelled", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "TaskCancelled",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "TaskCancelled",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as TaskCancelled;

          await processTaskCancelled(event, storage);
        })
      );
    },
  });
}

export async function processTaskCancelled(event: TaskCancelled, storage: Storage): Promise<void> {
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event) - 1;
  });

  const taskId = event.taskId.toString();
  await storage.tasks.update((tasks) => {
    createTaskIfNotExists(tasks, event.chainId, taskId);
    const task = tasks[event.chainId][taskId];
    task.state = TaskState.Closed;
    // Closed with no source means cancelled

    addEvent(task, taskEvent);
  });
}
