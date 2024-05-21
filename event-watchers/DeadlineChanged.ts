import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { DeadlineChanged } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, createTaskIfNotExists } from "./taskHelpers.js";

export function watchDeadlineChanged(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("DeadlineChanged", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "DeadlineChanged",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "DeadlineChanged",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as DeadlineChanged;

          await processDeadlineChanged(event, storage);
        })
      );
    },
  });
}

export async function processDeadlineChanged(event: DeadlineChanged, storage: Storage): Promise<void> {
  let alreadyProcessed = false;
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    if (tasksEvents.some((e) => e.transactionHash === event.transactionHash)) {
      alreadyProcessed = true;
      return;
    }
    taskEvent = tasksEvents.push(event) - 1;
  });
  if (alreadyProcessed) {
    return;
  }

  const taskId = event.taskId.toString();
  await storage.tasks.update((tasks) => {
    createTaskIfNotExists(tasks, event.chainId, taskId);
    const task = tasks[event.chainId][taskId];
    task.deadline = event.newDeadline;

    addEvent(task, taskEvent);
  });
}
