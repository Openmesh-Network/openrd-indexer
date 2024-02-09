import { Storage } from "..";
import { TasksContract } from "../contracts/Tasks";
import { RequestExecuted } from "../types/task-events";
import { Request, RequestType } from "../types/tasks";
import { ContractWatcher } from "../utils/contract-watcher";
import { createCancelTaskRequestIfNotExists, getRequest } from "./taskHelpers";

export function watchRequestExecuted(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("RequestExecuted", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "RequestExecuted",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "RequestExecuted",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as RequestExecuted;

          await processRequestExecuted(event, storage);
        })
      );
    },
  });
}

export async function processRequestExecuted(event: RequestExecuted, storage: Storage): Promise<void> {
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event) - 1;
  });

  const taskId = event.taskId.toString();
  await storage.tasks.update((tasks) => {
    const request = getRequest(tasks, event.chainId, taskId, event.requestType, event.requestId);
    const task = tasks[event.chainId][taskId];

    if (!request) {
      console.warn(`Request accepted with type ${event.requestType} did not match any known types. Ignored.`);
      return;
    }
    request.executed = true;

    task.events.push(taskEvent);
  });
}
