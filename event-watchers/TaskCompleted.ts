import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { TaskCompleted } from "../types/task-events.js";
import { TaskCompletionSource, TaskState } from "../types/tasks.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, createTaskIfNotExists } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchTaskCompleted(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("TaskCompleted", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "TaskCompleted",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "TaskCompleted",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as TaskCompleted;

          await processTaskCompleted(event, storage);
        })
      );
    },
  });
}

export async function processTaskCompleted(event: TaskCompleted, storage: Storage): Promise<void> {
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
    task.completionSource = event.source;

    if (event.source == TaskCompletionSource.SubmissionAccepted) {
      // Full reward is paid out
      if (task.applications[task.executorApplication]) {
        task.applications[task.executorApplication].nativeReward.forEach((nativeReward, i) => {
          if (!task.nativePaidOut[i]) {
            task.nativePaidOut[i] = BigInt(0);
          }

          task.nativePaidOut[i] += nativeReward.amount;
        });

        task.applications[task.executorApplication].reward.forEach((reward, i) => {
          if (!task.paidOut[i]) {
            task.paidOut[i] = BigInt(0);
          }

          task.paidOut[i] += reward.amount;
        });
      } else {
        console.warn(`Executor application of ${event.chainId}-${taskId} not found when completing task.`);
      }
    } // Dispute will trigger PartialPayment

    // Doesnt keep track of the budget refunded to the proposer

    addEvent(task, event);
  });
}
