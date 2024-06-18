import { parseAbiItem } from "viem";

import { Storage } from "../../types/storage.js";
import { ContractWatcher } from "../../utils/contract-watcher.js";
import { fetchMetadata } from "../../utils/metadata-fetch.js";
import { getPrice } from "../../utils/get-token-price.js";
import { chains, publicClients } from "../../utils/chain-cache.js";
import { RFPsContract } from "../../contracts/RFPs.js";
import { RFPCreated } from "../../types/rfp-events.js";
import { addEvent, createRFPIfNotExists } from "./rfpsHelpers.js";
import { addRFPEvent, getTimestamp } from "../eventHelpers.js";

export function watchRFPCreated(contractWatcher: ContractWatcher, storage: Storage) {
  contractWatcher.startWatching("RFPCreated", {
    abi: RFPsContract.abi,
    address: RFPsContract.address,
    eventName: "RFPCreated",
    strict: true,
    onLogs: async (logs) => {
      await Promise.all(
        logs.map(async (log) => {
          const { args, blockNumber, transactionHash, address, logIndex } = log;

          const event = {
            type: "RFPCreated",
            blockNumber: blockNumber,
            transactionHash: transactionHash,
            chainId: contractWatcher.chain.id,
            address: address,
            logIndex: logIndex,
            timestamp: await getTimestamp(contractWatcher.chain.id, blockNumber),
            ...args,
          } as RFPCreated;

          await processRFPCreated(event, storage);
        })
      );
    },
  });
}

export async function processRFPCreated(event: RFPCreated, storage: Storage): Promise<void> {
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
    createRFPIfNotExists(rfps, event.chainId, rfpId);
    const rfp = rfps[event.chainId][rfpId];
    rfp.metadata = event.metadata;
    rfp.deadline = event.deadline;
    rfp.escrow = event.escrow;
    rfp.creator = event.creator;
    rfp.tasksManager = event.tasksManager;
    rfp.disputeManager = event.disputeManager;
    rfp.manager = event.manager;
    rfp.budget = event.budget.map((b) => {
      return {
        tokenContract: b.tokenContract,
      };
    });

    addEvent(rfp, event);
  });

  await Promise.all([
    // Load/Cache metadata
    fetchMetadata(event.metadata)
      .then((metadata) =>
        storage.rfps.update((rfps) => {
          rfps[event.chainId][rfpId].cachedMetadata = metadata;
        })
      )
      .catch((err) => console.error(`Error while fetching task metadata ${event.metadata} (${event.chainId}-${rfpId}): ${err}`)),

    // Get USD value of budget + nativeBudget (paid, not received, although for most coins this is identical)
    getPrice(chains[event.chainId], event.nativeBudget, [...event.budget])
      .then((usdValue) => storage.rfps.update((rfps) => (rfps[event.chainId][rfpId].usdValue = usdValue)))
      .catch((err) => console.error(`Error while fetching usd value of ${event.chainId}-${rfpId}: ${err}`)),

    // Check the escrow ERC20 contents onchain (as there might be a transfer fee)
    Promise.all(
      event.budget.map(async (erc20) => {
        const balance = await publicClients[event.chainId].readContract({
          abi: [parseAbiItem("function balanceOf(address account) view returns (uint256)")],
          address: erc20.tokenContract,
          functionName: "balanceOf",
          args: [event.escrow],
        });
        return {
          tokenContract: erc20.tokenContract,
          amount: balance,
        };
      })
    )
      .then((onchainBudget) => storage.rfps.update((rfps) => (rfps[event.chainId][rfpId].budget = onchainBudget)))
      .catch((err) => console.error(`Error while fetching budget of ${event.chainId}-${rfpId}: ${err}`)),
  ]);
}
