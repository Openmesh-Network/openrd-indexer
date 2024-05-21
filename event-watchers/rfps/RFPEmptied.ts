import { parseAbiItem } from "viem";

import { Storage } from "../../types/storage.js";
import { ContractWatcher } from "../../utils/contract-watcher.js";
import { publicClients } from "../../utils/chain-cache.js";
import { RFPsContract } from "../../contracts/RFPs.js";
import { RFPEmptied } from "../../types/rfp-events.js";
import { createRFPIfNotExists } from "./rfpsHelpers.js";

export function watchRFPEmptied(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("RFPEmptied", {
    abi: RFPsContract.abi,
    address: RFPsContract.address,
    eventName: "RFPEmptied",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address } = log;

          const event = {
            type: "RFPEmptied",
            blockNumber: blockNumber,
            transactionHash: transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            ...args,
          } as RFPEmptied;

          await processRFPEmptied(event, storage);
        })
      );
    },
  });
}

export async function processRFPEmptied(event: RFPEmptied, storage: Storage): Promise<void> {
  let alreadyProcessed = false;
  let rfpEvent: number;
  await storage.rfpsEvents.update((rfpsEvents) => {
    if (rfpsEvents.some((e) => e.transactionHash === event.transactionHash)) {
      alreadyProcessed = true;
      return;
    }
    rfpEvent = rfpsEvents.push(event) - 1;
  });
  if (alreadyProcessed) {
    return;
  }

  const rfpId = event.rfpId.toString();
  await storage.rfps.update((rfps) => {
    createRFPIfNotExists(rfps, event.chainId, rfpId);
    const rfp = rfps[event.chainId][rfpId];

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
