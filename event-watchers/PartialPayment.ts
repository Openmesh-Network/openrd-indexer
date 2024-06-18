import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { PartialPayment } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, createTaskIfNotExists } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchPartialPayment(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("PartialPayment", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "PartialPayment",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "PartialPayment",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as PartialPayment;

          await processPartialPayment(event, storage);
        })
      );
    },
  });
}

export async function processPartialPayment(event: PartialPayment, storage: Storage): Promise<void> {
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
    const executorApplication = task.applications[task.executorApplication];
    if (!executorApplication) {
      console.warn(`Executor application undefined for partial payment ${event.chainId}:${event.taskId}`);
    }
    event.partialNativeReward.forEach((nativeReward, i) => {
      if (!task.nativePaidOut[i]) {
        task.nativePaidOut[i] = BigInt(0);
      }

      task.nativePaidOut[i] += nativeReward;
      if (executorApplication) {
        executorApplication.nativeReward[i].amount -= nativeReward;
      }
    });
    event.partialReward.forEach((reward, i) => {
      if (!task.paidOut[i]) {
        task.paidOut[i] = BigInt(0);
      }

      task.paidOut[i] += reward;
      if (executorApplication) {
        executorApplication.reward[i].amount -= reward;
      }
    });

    addEvent(task, event);
  });

  // Do we also wanna keep track of the usd value of the payout?
}
