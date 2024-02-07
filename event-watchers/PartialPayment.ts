import { Storage } from ".."
import { TasksContract } from "../contracts/Tasks"
import { PartialPayment } from "../types/task-events"
import { ContractWatcher } from "../utils/contract-watcher"
import { createTaskIfNotExists } from "./taskHelpers"

export function watchPartialPayment(
  contractWatcher: ContractWatcher,
  storage: Storage
) {
  contractWatcher.startWatching("PartialPayment", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "PartialPayment",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log

          const event = {
            type: "PartialPayment",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as PartialPayment

          await processPartialPayment(event, storage)
        })
      )
    },
  })
}

export async function processPartialPayment(
  event: PartialPayment,
  storage: Storage
): Promise<void> {
  let taskEvent: number
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event) - 1
  })

  const taskId = event.taskId.toString()
  await storage.tasks.update((tasks) => {
    createTaskIfNotExists(tasks, event.chainId, taskId)
    const task = tasks[event.chainId][taskId]
    event.partialNativeReward.forEach((nativeReward, i) => {
      if (!task.nativePaidOut[i]) {
        task.nativePaidOut[i] = BigInt(0)
      }

      task.nativePaidOut[i] += nativeReward
    })
    event.partialReward.forEach((reward, i) => {
      if (!task.paidOut[i]) {
        task.paidOut[i] = BigInt(0)
      }

      task.paidOut[i] += reward
    })

    task.events.push(taskEvent)
  })

  // Do we also wanna keep track of the usd value of the payout?
}
