import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { RequestAccepted } from "../types/task-events.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, getRequest } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchRequestAccepted(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("RequestAccepted", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "RequestAccepted",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "RequestAccepted",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as RequestAccepted;

          await processRequestAccepted(event, storage);
        })
      );
    },
  });
}

export async function processRequestAccepted(event: RequestAccepted, storage: Storage): Promise<void> {
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
    const request = getRequest(tasks, event.chainId, taskId, event.requestType, event.requestId);
    const task = tasks[event.chainId][taskId];

    if (!request) {
      console.warn(`Request accepted with type ${event.requestType} did not match any known types. Ignored.`);
      return;
    }
    request.accepted = true;

    addEvent(task, event);
  });
}
