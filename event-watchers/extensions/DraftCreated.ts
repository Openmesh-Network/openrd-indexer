import { Storage } from "../..";
import { TasksDraftsContract } from "../../contracts/TasksDrafts.js";
import { DraftCreated } from "../../types/task-events.js";
import { ContractWatcher } from "../../utils/contract-watcher.js";
import { fetchMetadata } from "../../utils/metadata-fetch.js";
import { normalizeAddress } from "../userHelpers.js";
import { createDraftDAOIfNotExists } from "./draftHelpers.js";

export function watchDraftCreated(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("DraftCreated", {
    abi: TasksDraftsContract.abi,
    address: TasksDraftsContract.address,
    eventName: "TaskDraftCreated",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "TaskDraftCreated",
            blockNumber,
            transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as DraftCreated;

          await proccessDraftCreated(event, storage);
        })
      );
    },
  });
}

export async function proccessDraftCreated(event: DraftCreated, storage: Storage): Promise<void> {
  let taskEvent: number;
  await storage.tasksEvents.update((tasksEvents) => {
    taskEvent = tasksEvents.push(event) - 1;
  });

  let draftIndex: number;
  const dao = normalizeAddress(event.dao);
  await storage.drafts.update((drafts) => {
    createDraftDAOIfNotExists(drafts, event.chainId, dao);
    draftIndex =
      drafts[event.chainId][dao].push({
        metadata: event.info.metadata,
        deadline: event.info.deadline,
        manager: event.info.manager,
        disputeManager: event.info.disputeManager,
        nativeBudget: event.info.nativeBudget,
        budget: event.info.budget,
        preapproved: event.info.preapproved,

        governancePlugin: event.governancePlugin,
        proposalId: event.proposalId,

        cachedMetadata: "",
      }) - 1;
  });

  await fetchMetadata(event.info.metadata)
    .then((metadata) =>
      storage.drafts.update((drafts) => {
        drafts[event.chainId][dao][draftIndex].cachedMetadata = metadata;
      })
    )
    .catch((err) => console.error(`Error while fetching draft metadata ${event.info.metadata} (${event.chainId}-${event.dao}-${draftIndex}): ${err}`));
}
