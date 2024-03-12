import { Storage } from "..";
import { TasksContract } from "../contracts/Tasks.js";
import { RequestAccepted } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, getRequest } from "./taskHelpers.js";

export function watchRequestAccepted(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("RequestAccepted", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "RequestAccepted",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "RequestAccepted",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as RequestAccepted;

          await processRequestAccepted(event, storage);
        })
      );
    },
  });
}

export async function processRequestAccepted(event: RequestAccepted, storage: Storage): Promise<void> {
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
    request.accepted = true;

    addEvent(task, taskEvent);
  });
}
