import { Address } from "viem";

import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { ManagerChanged } from "../types/task-events.js";
import { TaskRole } from "../types/user.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, createTaskIfNotExists } from "./taskHelpers.js";
import { createUserTaskNetworkIfNotExists } from "./userHelpers.js";
import { normalizeAddress } from "../utils/normalize-address.js";

export function watchManagerChanged(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("ManagerChanged", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "ManagerChanged",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "ManagerChanged",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as ManagerChanged;

          await processManagerChanged(event, storage);
        })
      );
    },
  });
}

export async function processManagerChanged(event: ManagerChanged, storage: Storage): Promise<void> {
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event) - 1;
  });

  let oldManager: Address;
  const taskId = event.taskId.toString();
  await storage.tasks.update((tasks) => {
    createTaskIfNotExists(tasks, event.chainId, taskId);
    const task = tasks[event.chainId][taskId];
    oldManager = task.manager;
    task.manager = event.newManager;

    addEvent(task, taskEvent);
  });

  await storage.users.update((users) => {
    const manager = normalizeAddress(event.newManager);
    createUserTaskNetworkIfNotExists(users, manager, event.chainId);
    users[manager].tasks[event.chainId][taskId].push(TaskRole.Manager);

    if (users[oldManager]?.tasks && users[oldManager].tasks[event.chainId] && users[oldManager].tasks[event.chainId][taskId]) {
      const index = users[oldManager].tasks[event.chainId][taskId].indexOf(TaskRole.Manager);
      if (index == -1) {
        console.warn(`Old manager role from ${oldManager} (${event.chainId}-${taskId}) not found.`);
      } else {
        users[oldManager].tasks[event.chainId][taskId].splice(index, 1);
      }
    }
  });
}
