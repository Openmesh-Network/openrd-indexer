import { Storage } from "../../types/storage.js";
import { ContractWatcher } from "../../utils/contract-watcher.js";
import { fetchMetadata } from "../../utils/metadata-fetch.js";
import { RFPsContract } from "../../contracts/RFPs.js";
import { ProjectSubmitted } from "../../types/rfp-events.js";
import { createProjectIfNotExists } from "./rfpsHelpers.js";

export function watchProjectSubmitted(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("ProjectSubmitted", {
    abi: RFPsContract.abi,
    address: RFPsContract.address,
    eventName: "ProjectSubmitted",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "ProjectSubmitted",
            blockNumber: blockNumber,
            transactionHash: transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as ProjectSubmitted;

          await processProjectSubmitted(event, storage);
        })
      );
    },
  });
}

export async function processProjectSubmitted(event: ProjectSubmitted, storage: Storage): Promise<void> {
  let rfpEvent: number;
  await storage.rfpsEvents.update((rfpsEvents) => {
    rfpEvent = rfpsEvents.push(event) - 1;
  });

  const rfpId = event.rfpId.toString();
  await storage.rfps.update((rfps) => {
    createProjectIfNotExists(rfps, event.chainId, rfpId, event.projectId);
    const rfp = rfps[event.chainId][rfpId];
    const project = rfp.projects[event.projectId];
    project.metadata = event.metadata;
    project.representative = event.representative;
    project.deadline = event.deadline;
    project.nativeReward = [...event.nativeReward];
    project.reward = [...event.reward];

    rfp.events.push(rfpEvent);
  });

  fetchMetadata(event.metadata)
    .then((metadata) =>
      storage.rfps.update((rfps) => {
        rfps[event.chainId][rfpId].projects[event.projectId].cachedMetadata = metadata;
      })
    )
    .catch((err) => console.error(`Error while fetching project metadata ${event.metadata} (${event.chainId}-${rfpId}-${event.projectId}): ${err}`));
}
