import { Storage } from "..";
import { TasksContract } from "../contracts/Tasks";
import { RewardIncreased } from "../types/task-events";
import { ContractWatcher } from "../utils/contract-watcher";
import { addEvent, createApplicationIfNotExists } from "./taskHelpers";

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
    application.nativeReward.map((nativeReward, i) => {
      return { ...nativeReward, amount: nativeReward.amount + event.nativeIncrease[i] };
    });
    application.reward.map((reward, i) => {
      return { ...reward, amount: reward.amount + event.increase[i] };
    });

    addEvent(task, taskEvent);
  });
}
