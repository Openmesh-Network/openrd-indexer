import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { DeadlineChanged } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, createTaskIfNotExists } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchDeadlineChanged(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("DeadlineChanged", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "DeadlineChanged",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "DeadlineChanged",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
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
    task.deadline = event.newDeadline;

    addEvent(task, event);
  });
}
