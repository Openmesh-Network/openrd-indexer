import { Storage } from ".."
import { TasksContract } from "../contracts/Tasks"
import { ApplicationCreated } from "../types/task-events"
import { TaskRole } from "../types/user"
import { ContractWatcher } from "../utils/contract-watcher"
import { fetchMetadata } from "../utils/metadata-fetch"
import { createApplicationIfNotExists } from "./taskHelpers"
import { createUserTaskIfNotExists, normalizeAddress } from "./userHelpers"

export function watchApplicationCreated(
  contractWatcher: ContractWatcher,
  storage: Storage
) {
  contractWatcher.startWatching("ApplicationCreated", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "ApplicationCreated",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log

          const event = {
            type: "ApplicationCreated",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as ApplicationCreated

          await proccessApplicationCreated(event, storage)
        })
      )
    },
  })
}

export async function proccessApplicationCreated(
  event: ApplicationCreated,
  storage: Storage
): Promise<void> {
  let taskEvent: number
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event)
  })

  const taskId = event.taskId.toString()
  await storage.tasks.update((tasks) => {
    createApplicationIfNotExists(
      tasks,
      event.chainId,
      taskId,
      event.applicationId
    )
    const task = tasks[event.chainId][taskId]
    const application = task.applications[event.applicationId]
    application.metadata = event.metadata
    application.applicant = event.applicant
    application.nativeReward = [...event.nativeReward]
    application.reward = [...event.reward]

    task.events.push(taskEvent)
  })

  await storage.users.update((users) => {
    const applicant = normalizeAddress(event.applicant)
    createUserTaskIfNotExists(users, applicant, event.chainId, taskId)
    users[applicant].tasks[event.chainId][taskId].push(TaskRole.Applicant)
  })

  await fetchMetadata(event.metadata)
    .then((metadata) =>
      storage.tasks.update((tasks) => {
        tasks[event.chainId][taskId].applications[
          event.applicationId
        ].cachedMetadata = metadata
      })
    )
    .catch((err) =>
      console.error(
        `Error while fetching application metadata ${event.metadata} (${
          event.chainId
        }-${taskId}): ${JSON.stringify(err)}`
      )
    )
}
