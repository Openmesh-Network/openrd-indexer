import { parseAbiItem } from "viem";

import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { TaskCreated } from "../types/task-events.js";
import { TaskRole } from "../types/user.js";
import { chains, publicClients } from "../utils/chain-cache.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { getPrice } from "../utils/get-token-price.js";
import { fetchMetadata } from "../utils/metadata-fetch.js";
import { addEvent, createTaskIfNotExists } from "./taskHelpers.js";
import { createUserTaskIfNotExists } from "./userHelpers.js";
import { normalizeAddress } from "../utils/normalize-address.js";
import { addTaskEvent, getTimestamp } from "./eventHelpers.js";

export function watchTaskCreated(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("TaskCreated", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "TaskCreated",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "TaskCreated",
            blockNumber: blockNumber,
            transactionHash: transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as TaskCreated;

          await processTaskCreated(event, storage);
        })
      );
    },
  });
}

export async function processTaskCreated(event: TaskCreated, storage: Storage): Promise<void> {
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
    task.metadata = event.metadata;
    task.deadline = event.deadline;
    task.manager = event.manager;
    task.disputeManager = event.disputeManager;
    task.creator = event.creator;
    task.nativeBudget = event.nativeBudget;
    task.budget = [...event.budget];
    task.escrow = event.escrow;

    addEvent(task, event);
  });

  await storage.users.update((users) => {
    const creator = normalizeAddress(event.creator);
    createUserTaskIfNotExists(users, creator, event.chainId, taskId);
    users[creator].tasks[event.chainId][taskId].push(TaskRole.Creator);

    const manager = normalizeAddress(event.manager);
    createUserTaskIfNotExists(users, manager, event.chainId, taskId);
    users[manager].tasks[event.chainId][taskId].push(TaskRole.Manager);

    const disputeManager = normalizeAddress(event.disputeManager);
    createUserTaskIfNotExists(users, disputeManager, event.chainId, taskId);
    users[disputeManager].tasks[event.chainId][taskId].push(TaskRole.DisputeManager);
  });

  await Promise.all([
    // Load/Cache metadata
    fetchMetadata(event.metadata)
      .then((metadata) =>
        storage.tasks.update((tasks) => {
          tasks[event.chainId][taskId].cachedMetadata = metadata;
        })
      )
      .catch((err) => console.error(`Error while fetching task metadata ${event.metadata} (${event.chainId}-${taskId}): ${err}`)),

    // Get USD value of budget + nativeBudget (paid, not received, although for most coins this is identical)
    getPrice(chains[event.chainId], event.nativeBudget, [...event.budget])
      .then((usdValue) => storage.tasks.update((tasks) => (tasks[event.chainId][taskId].usdValue = usdValue)))
      .catch((err) => console.error(`Error while fetching usd value of ${event.chainId}-${taskId}: ${err}`)),

    // Check the escrow ERC20 contents onchain (as there might be a transfer fee)
    Promise.all(
      event.budget.map(async (erc20) => {
        const balance = await publicClients[event.chainId].readContract({
          abi: [parseAbiItem("function balanceOf(address account) view returns (uint256)")],
          address: erc20.tokenContract,
          functionName: "balanceOf",
          args: [event.escrow],
        });
        return {
          tokenContract: erc20.tokenContract,
          amount: balance,
        };
      })
    )
      .then((onchainBudget) => storage.tasks.update((tasks) => (tasks[event.chainId][taskId].budget = onchainBudget)))
      .catch((err) => console.error(`Error while fetching budget of ${event.chainId}-${taskId}: ${err}`)),
  ]);
}
