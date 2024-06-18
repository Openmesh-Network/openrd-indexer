import { decodeEventLog, decodeFunctionData } from "viem";
import { Storage } from "../../types/storage.js";
import { TasksContract } from "../../contracts/Tasks.js";
import { TaskDraftsContract } from "../../contracts/TaskDrafts.js";
import { TrustlessActionsContract } from "../../contracts/TrustlessActions.js";
import { DraftCreated } from "../../types/task-events.js";
import { publicClients } from "../../utils/chain-cache.js";
import { ContractWatcher } from "../../utils/contract-watcher.js";
import { fetchMetadata } from "../../utils/metadata-fetch.js";
import { createDraftDAOIfNotExists } from "./draftHelpers.js";
import { normalizeAddress } from "../../utils/normalize-address.js";
import { addTaskEvent, getTimestamp } from "../eventHelpers.js";

export function watchDraftCreated(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("DraftCreated", {
    abi: TaskDraftsContract.abi,
    address: TaskDraftsContract.address,
    eventName: "TrustlessActionCreated",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "TaskDraftCreated",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as DraftCreated;

          await proccessDraftCreated(event, storage);
        })
      );
    },
  });
}

export async function proccessDraftCreated(event: DraftCreated, storage: Storage): Promise<void> {
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
  const draftAction = trustlessAction.args.actions[0];
  if (normalizeAddress(draftAction.to) != normalizeAddress(TasksContract.address)) {
    console.warn(`Draft action created with different Tasks contract (${draftAction.to}) vs our (${TasksContract.address})`);
    return;
  }
  const draft = decodeFunctionData({
    abi: TasksContract.abi,
    data: draftAction.data,
  });
  if (draft.functionName !== "createTask") {
    console.warn(`Draft action created with wrong action (${draft.functionName}) vs expected (createTask)`);
    return;
  }

  const metadata = draft.args[0];
  const deadline = draft.args[1];
  const manager = draft.args[2];
  const disputeManager = draft.args[3];
  const nativeBudget = draftAction.value;
  const budget = [...draft.args[4]];
  const preapproved = draft.args[5].map((preapproved) => {
    return {
      ...preapproved,
      nativeReward: [...preapproved.nativeReward],
      reward: [...preapproved.reward],
    };
  });
  event.info = {
    budget: budget,
    deadline: deadline,
    disputeManager: disputeManager,
    manager: manager,
    metadata: metadata,
    nativeBudget: nativeBudget,
    preapproved: preapproved,
  };

  let draftIndex: number;
  const dao = normalizeAddress(event.dao);
  await storage.drafts.update((drafts) => {
    createDraftDAOIfNotExists(drafts, event.chainId, dao);
    draftIndex =
      drafts[event.chainId][dao].push({
        metadata: metadata,
        deadline: deadline,
        manager: manager,
        disputeManager: disputeManager,
        nativeBudget: nativeBudget,
        budget: budget,
        preapproved: preapproved,

        trustlessActions: event.trustlessActions,
        actionId: event.actionId,
        actionMetadata: trustlessAction.args.metadata,

        cachedMetadata: "",

        cachedActionMetadata: "",
      }) - 1;
  });

  await Promise.all([
    fetchMetadata(metadata)
      .then((metadata) =>
        storage.drafts.update((drafts) => {
          drafts[event.chainId][dao][draftIndex].cachedMetadata = metadata;
        })
      )
      .catch((err) => console.error(`Error while fetching draft metadata ${metadata} (${event.chainId}-${event.dao}-${draftIndex}): ${err}`)),

    fetchMetadata(trustlessAction.args.metadata)
      .then((actionMetadata) =>
        storage.drafts.update((drafts) => {
          drafts[event.chainId][dao][draftIndex].cachedActionMetadata = actionMetadata;
        })
      )
      .catch((err) =>
        console.error(`Error while fetching draft action metadata ${trustlessAction.args.metadata} (${event.chainId}-${event.dao}-${draftIndex}): ${err}`)
      ),
  ]);
}
