import { Storage } from ".."
import { TasksContract } from "../contracts/Tasks"
import { CancelTaskRequested } from "../types/task-events"
import { ContractWatcher } from "../utils/contract-watcher"
import { fetchMetadata } from "../utils/metadata-fetch"
import { createCancelTaskRequestIfNotExists } from "./taskHelpers"

export function watchCancelTaskRequested(
  contractWatcher: ContractWatcher,
  storage: Storage
) {
  contractWatcher.startWatching("CancelTaskRequested", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "CancelTaskRequested",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log

          const event = {
            type: "CancelTaskRequested",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as CancelTaskRequested

          await processCancelTaskRequested(event, storage)
        })
      )
    },
  })
}

export async function processCancelTaskRequested(
  event: CancelTaskRequested,
  storage: Storage
): Promise<void> {
  let taskEvent: number
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event)
  })

  const taskId = event.taskId.toString()
  await storage.tasks.update((tasks) => {
    createCancelTaskRequestIfNotExists(
      tasks,
      event.chainId,
      taskId,
      event.requestId
    )
    const task = tasks[event.chainId][taskId]
    const request = task.cancelTaskRequests[event.requestId]
    request.metadata = event.metadata

    task.events.push(taskEvent)
  })

  await fetchMetadata(event.metadata)
    .then((metadata) =>
      storage.tasks.update((tasks) => {
        tasks[event.chainId][taskId].cancelTaskRequests[
          event.requestId
        ].cachedMetadata = metadata
      })
    )
    .catch((err) =>
      console.error(
        `Error while fetching metadata ${event.metadata} (${
          event.chainId
        }-${taskId}): ${JSON.stringify(err)}`
      )
    )
}
