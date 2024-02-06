import { parseAbiItem } from "viem"

import { Storage } from ".."
import { TasksContract } from "../contracts/Tasks"
import { BudgetChanged } from "../types/task-events"
import { publicClients } from "../utils/chain-cache"
import { ContractWatcher } from "../utils/contract-watcher"
import { createTaskIfNotExists } from "./taskHelpers"

export function watchBudgetChanged(
  contractWatcher: ContractWatcher,
  storage: Storage
) {
  contractWatcher.startWatching("BudgetChanged", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "BudgetChanged",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log

          const event = {
            type: "BudgetChanged",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as BudgetChanged

          await processBudgetChanged(event, storage)
        })
      )
    },
  })
}

export async function processBudgetChanged(
  event: BudgetChanged,
  storage: Storage
): Promise<void> {
  let taskEvent: number
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event)
  })

  const taskId = event.taskId.toString()
  await storage.tasks.update((tasks) => {
    createTaskIfNotExists(tasks, event.chainId, taskId)
    const task = tasks[event.chainId][taskId]
    // Budget gets updated in the next statement (as it might fail and we wanna be sure the taskEvent is added)
    // task.budget = ...

    task.events.push(taskEvent)
  })

  await storage.tasks
    .get()
    .then((tasks) => {
      const task = tasks[event.chainId][taskId]
      return Promise.all(
        task.budget.map(async (erc20) => {
          const balance = await publicClients[event.chainId].readContract({
            abi: [
              parseAbiItem(
                "function balanceOf(address account) view returns (uint256)"
              ),
            ],
            address: erc20.tokenContract,
            functionName: "balanceOf",
            args: [task.escrow],
          })
          return {
            tokenContract: erc20.tokenContract,
            amount: balance,
          }
        })
      )
    })
    .then((onchainBudget) =>
      storage.tasks.update(
        (tasks) => (tasks[event.chainId][taskId].budget = onchainBudget)
      )
    )
    .catch((err) =>
      console.error(
        `Error while fetching changed budget of ${
          event.chainId
        }-${taskId}: ${JSON.stringify(err)}`
      )
    )

  // Somehow update usdValue too?
}
