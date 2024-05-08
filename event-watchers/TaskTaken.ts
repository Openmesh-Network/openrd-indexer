import { Storage } from "../types/storage.js";
import { TasksContract } from "../contracts/Tasks.js";
import { TaskTaken } from "../types/task-events.js";
import { TaskState } from "../types/tasks.js";
import { TaskRole } from "../types/user.js";
import { ContractWatcher } from "../utils/contract-watcher.js";
import { normalizeAddress } from "../utils/normalize-address.js";
import { addEvent, createApplicationIfNotExists } from "./taskHelpers.js";
import { createUserTaskIfNotExists } from "./userHelpers.js";

export function watchTaskTaken(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("TaskTaken", {
    abi: TasksContract.abi,
    address: TasksContract.address,
    eventName: "TaskTaken",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "TaskTaken",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as TaskTaken;

          await processTaskTaken(event, storage);
        })
      );
    },
  });
}

export async function processTaskTaken(event: TaskTaken, storage: Storage): Promise<void> {
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event) - 1;
  });

  const taskId = event.taskId.toString();
  await storage.tasks.update((tasks) => {
    createApplicationIfNotExists(tasks, event.chainId, taskId, event.applicationId);
    const task = tasks[event.chainId][taskId];
    task.state = TaskState.Taken;
    task.executorApplication = event.applicationId;

    addEvent(task, taskEvent);
  });

  const application = await storage.tasks.get().then((task) => task[event.chainId][taskId].applications[event.applicationId]);
  if (!application) {
    console.warn(`Task taken ${event.chainId}-${taskId}, but application ${event.applicationId} wasnt found.`);
  } else {
    await storage.users.update((users) => {
      const executor = normalizeAddress(application.applicant);
      createUserTaskIfNotExists(users, executor, event.chainId, taskId);
      users[executor].tasks[event.chainId][taskId].push(TaskRole.Executor);
    });
  }
}
