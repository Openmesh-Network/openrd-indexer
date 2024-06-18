import { parseAbiItem } from "viem";

import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { BudgetChanged } from "../types/task-events.js";
import { publicClients } from "../utils/chain-cache.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { addEvent, createTaskIfNotExists } from "./taskHelpers.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchBudgetChanged(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("BudgetChanged", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "BudgetChanged",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "BudgetChanged",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as BudgetChanged;

          await processBudgetChanged(event, storage);
        })
      );
    },
  });
}

export async function processBudgetChanged(event: BudgetChanged, storage: Storage): Promise<void> {
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
    // Budget gets updated in the next statement (as it might fail and we wanna be sure the taskEvent is added)
    // task.budget = ...

    addEvent(task, event);
  });

  await storage.tasks
    .get()
    .then((tasks) => {
      const task = tasks[event.chainId][taskId];
      return Promise.all(
        task.budget.map(async (erc20) => {
          const balance = await publicClients[event.chainId].readContract({
            abi: [parseAbiItem("function balanceOf(address account) view returns (uint256)")],
            address: erc20.tokenContract,
            functionName: "balanceOf",
            args: [task.escrow],
          });
          return {
            tokenContract: erc20.tokenContract,
            amount: balance,
          };
        })
      );
    })
    .then((onchainBudget) => storage.tasks.update((tasks) => (tasks[event.chainId][taskId].budget = onchainBudget)))
    .catch((err) => console.error(`Error while fetching changed budget of ${event.chainId}-${taskId}: ${err}`));

  // Somehow update usdValue too?
}
