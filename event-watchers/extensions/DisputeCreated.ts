import { decodeEventLog, decodeFunctionData } from "viem";
import { Storage } from "../../types/storage.js";
import { TasksContract } from "../../contracts/Tasks.js";
import { TaskDisputesContract } from "../../contracts/TaskDisputes.js";
import { TrustlessActionsContract } from "../../contracts/TrustlessActions.js";
import { DisputeCreated } from "../../types/task-events.js";
import { publicClients } from "../../utils/chain-cache.js";
import { ContractWatcher } from "../../utils/contract-watcher.js";
import { addEvent, createTaskIfNotExists } from "../taskHelpers.js";
import { createDisputeTaskIfNotExists } from "./disputeHelpers.js";
import { fetchMetadata } from "../../utils/metadata-fetch.js";
import { normalizeAddress } from "../../utils/normalize-address.js";

export function watchDisputeCreated(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("DisputeCreated", {
    abi: TaskDisputesContract.abi,
    address: TaskDisputesContract.address,
    eventName: "TrustlessActionCreated",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "DisputeCreated",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as DisputeCreated;

          await proccessDisputeCreated(event, storage);
        })
      );
    },
  });
}

export async function proccessDisputeCreated(event: DisputeCreated, storage: Storage): Promise<void> {
  let alreadyProcessed = false;
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    if (tasksEvents.some((e) => e.transactionHash === event.transactionHash)) {
      alreadyProcessed = true;
      return;
    }
    taskEvent = tasksEvents.push(event) - 1;
  });
  if (alreadyProcessed) {
    return;
  }

  const transactionReceipt = await publicClients[event.chainId].getTransactionReceipt({
    hash: event.transactionHash,
  });
  const trustlessActionCreatedEvents = transactionReceipt.logs
    .map((log) => {
      if (normalizeAddress(log.address) !== normalizeAddress(event.trustlessActions)) {
        return undefined;
      }

      try {
        return decodeEventLog({
          abi: TrustlessActionsContract.abi,
          eventName: "ActionCreated",
          topics: log.topics,
          data: log.data,
          strict: true,
        });
      } catch (err) {
        return undefined;
      }
    })
    .filter((creationEvent) => creationEvent !== undefined);
  const trustlessAction = trustlessActionCreatedEvents.find(
    (creationEvent) =>
      creationEvent && normalizeAddress(creationEvent.args.dao) == normalizeAddress(event.dao) && creationEvent.args.id === Number(event.actionId)
  );
  if (!trustlessAction) {
    console.warn(`Trustless action creation event not found (${event.transactionHash})`);
    return;
  }
  const disputeAction = trustlessAction.args.actions[0];
  if (normalizeAddress(disputeAction.to) != normalizeAddress(TasksContract.address)) {
    console.warn(`Dispute action created with different Tasks contract (${disputeAction.to}) vs our (${TasksContract.address})`);
    return;
  }
  const dispute = decodeFunctionData({
    abi: TasksContract.abi,
    data: disputeAction.data,
  });
  if (dispute.functionName !== "completeByDispute") {
    console.warn(`Dispute action created with wrong action (${dispute.functionName}) vs expected (completeByDispute)`);
    return;
  }

  const taskId = dispute.args[0].toString();
  const partialNativeReward = dispute.args[1];
  const partialReward = dispute.args[2];
  await storage.tasks.update((tasks) => {
    createTaskIfNotExists(tasks, event.chainId, taskId);
    const task = tasks[event.chainId][taskId];
    if (event.dao === task.disputeManager) {
      // Otherwise someone created a request to some random DAO (without dispute permission on this task)
      addEvent(task, taskEvent);
    }
  });

  let disputeIndex: number;
  await storage.disputes.update((disputes) => {
    createDisputeTaskIfNotExists(disputes, event.chainId, taskId);
    disputeIndex =
      disputes[event.chainId][taskId].push({
        partialNativeReward: [...partialNativeReward],
        partialReward: [...partialReward],

        trustlessActions: event.trustlessActions,
        actionId: event.actionId,
        actionMetadata: trustlessAction.args.metadata,

        cachedActionMetadata: "",
      }) - 1;
  });

  await fetchMetadata(trustlessAction.args.metadata)
    .then((actionMetadata) =>
      storage.disputes.update((disputes) => {
        disputes[event.chainId][taskId][disputeIndex].cachedActionMetadata = actionMetadata;
      })
    )
    .catch((err) =>
      console.error(`Error while fetching dispute action metadata ${trustlessAction.args.metadata} (${event.chainId}-${event.dao}-${disputeIndex}): ${err}`)
    );
}
