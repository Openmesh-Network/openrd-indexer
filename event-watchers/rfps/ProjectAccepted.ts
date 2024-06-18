import { parseAbiItem } from "viem";

import { Storage } from "../../types/storage.js";
import { ContractWatcher } from "../../utils/contract-watcher.js";
import { publicClients } from "../../utils/chain-cache.js";
import { RFPsContract } from "../../contracts/RFPs.js";
import { ProjectAccepted } from "../../types/rfp-events.js";
import { addEvent, createProjectIfNotExists } from "./rfpsHelpers.js";
import { addRFPEvent, getTimestamp } from "../eventHelpers.js";

export function watchProjectAccepted(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("ProjectAccepted", {
    abi: RFPsContract.abi,
    address: RFPsContract.address,
    eventName: "ProjectAccepted",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "ProjectAccepted",
            blockNumber: blockNumber,
            transactionHash: transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as ProjectAccepted;

          await processProjectAccepted(event, storage);
        })
      );
    },
  });
}

export async function processProjectAccepted(event: ProjectAccepted, storage: Storage): Promise<void> {
  let alreadyProcessed = false;
  await storage.rfpsEvents.update((rfpsEvents) => {
    if (rfpsEvents[event.chainId]?.[event.transactionHash]?.[event.logIndex] !== undefined) {
      alreadyProcessed = true;
      return;
    }
    addRFPEvent(rfpsEvents, event);
  });
  if (alreadyProcessed) {
    return;
  }

  const rfpId = event.rfpId.toString();
  await storage.rfps.update((rfps) => {
    createProjectIfNotExists(rfps, event.chainId, rfpId, event.projectId);
    const rfp = rfps[event.chainId][rfpId];
    const project = rfp.projects[event.projectId];
    project.accepted = true;
    project.taskId = event.taskId;

    addEvent(rfp, event);
  });

  await Promise.all(
    await storage.rfps.get().then((rfps) => {
      const rfp = rfps[event.chainId][rfpId];
      return rfp.budget.map(async (erc20) => {
        const balance = await publicClients[event.chainId].readContract({
          abi: [parseAbiItem("function balanceOf(address account) view returns (uint256)")],
          address: erc20.tokenContract,
          functionName: "balanceOf",
          args: [rfp.escrow],
        });
        return {
          tokenContract: erc20.tokenContract,
          amount: balance,
        };
      });
    })
  )
    .then((onchainBudget) => storage.rfps.update((rfps) => (rfps[event.chainId][rfpId].budget = onchainBudget)))
    .catch((err) => console.error(`Error while fetching budget of ${event.chainId}-${rfpId}: ${err}`));
}
