import { parseAbiItem } from "viem";

import { Storage } from "../..";
import { ContractWatcher } from "../../utils/contract-watcher.js";
import { publicClients } from "../../utils/chain-cache.js";
import { RFPsContract } from "../../contracts/RFPs.js";
import { ProjectAccepted } from "../../types/rfp-events.js";
import { createProjectIfNotExists } from "./rfpsHelpers.js";

export function watchProjectAccepted(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("ProjectAccepted", {
    abi: RFPsContract.abi,
    address: RFPsContract.address,
    eventName: "ProjectAccepted",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "ProjectAccepted",
            blockNumber: blockNumber,
            transactionHash: transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as ProjectAccepted;

          await processProjectAccepted(event, storage);
        })
      );
    },
  });
}

export async function processProjectAccepted(event: ProjectAccepted, storage: Storage): Promise<void> {
  let rfpEvent: number;
  await storage.rfpsEvents.update((rfpsEvents) => {
    rfpEvent = rfpsEvents.push(event) - 1;
  });

  const rfpId = event.rfpId.toString();
  await storage.rfps.update((rfps) => {
    createProjectIfNotExists(rfps, event.chainId, rfpId, event.projectId);
    const rfp = rfps[event.chainId][rfpId];
    const project = rfp.projects[event.projectId];
    project.accepted = true;
    project.taskId = event.taskId;

    rfp.events.push(rfpEvent);
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
