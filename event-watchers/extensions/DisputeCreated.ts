import { Storage } from "../..";
import { TasksDisputesContract } from "../../contracts/TasksDisputes";
import { DisputeCreated } from "../../types/task-events";
import { ContractWatcher } from "../../utils/contract-watcher";
import { addEvent, createTaskIfNotExists } from "../taskHelpers";
import { createDisputeTaskIfNotExists } from "./disputeHelpers";

export function watchDisputeCreated(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("DisputeCreated", {
    abi: TasksDisputesContract.abi,
    address: TasksDisputesContract.address,
    eventName: "DisputeCreated",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "DisputeCreated",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as DisputeCreated;

          await proccessDisputeCreated(event, storage);
        })
      );
    },
  });
}

export async function proccessDisputeCreated(event: DisputeCreated, storage: Storage): Promise<void> {
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event) - 1;
  });

  const taskId = event.dispute.taskId.toString();
  await storage.tasks.update((tasks) => {
    createTaskIfNotExists(tasks, event.chainId, taskId);
    const task = tasks[event.chainId][taskId];
    if (event.dao === task.disputeManager) {
      // Otherwise someone created a request to some random DAO (without dispute permission on this task)
      addEvent(task, taskEvent);
    }
  });

  await storage.disputes.update((disputes) => {
    createDisputeTaskIfNotExists(disputes, event.chainId, taskId);
    disputes[event.chainId][taskId].push({
      partialNativeReward: event.dispute.partialNativeReward,
      partialReward: event.dispute.partialReward,

      governancePlugin: event.governancePlugin,
      proposalId: event.proposalId,
    });
  });
}
