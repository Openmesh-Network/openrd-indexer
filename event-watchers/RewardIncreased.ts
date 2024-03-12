import { Storage } from "..";
import { TasksContract } from "../contracts/Tasks.js";
import { RewardIncreased } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, createApplicationIfNotExists } from "./taskHelpers.js";

export function watchRewardIncreased(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("RewardIncreased", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "RewardIncreased",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "RewardIncreased",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as RewardIncreased;

          await proccessRewardIncreased(event, storage);
        })
      );
    },
  });
}

export async function proccessRewardIncreased(event: RewardIncreased, storage: Storage): Promise<void> {
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event) - 1;
  });

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

    addEvent(task, taskEvent);
  });
}
