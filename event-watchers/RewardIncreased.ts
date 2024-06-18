import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { RewardIncreased } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, createApplicationIfNotExists } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchRewardIncreased(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("RewardIncreased", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "RewardIncreased",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "RewardIncreased",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as RewardIncreased;

          await proccessRewardIncreased(event, storage);
        })
      );
    },
  });
}

export async function proccessRewardIncreased(event: RewardIncreased, storage: Storage): Promise<void> {
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
    application.nativeReward.forEach((nativeReward, i) => {
      nativeReward.amount += event.nativeIncrease[i];
    });
    application.reward.forEach((reward, i) => {
      reward.amount += event.increase[i];
    });

    addEvent(task, event);
  });
}
