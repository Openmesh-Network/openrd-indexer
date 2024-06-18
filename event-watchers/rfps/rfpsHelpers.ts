import { zeroAddress } from "viem";
import { RFPsStorage } from "../../types/storage.js";
import { IndexedRFP } from "../../types/rfp.js";
import { RFPEvent } from "../../types/rfp-events.js";

export function createChainIfNotExists(rfps: RFPsStorage, chainId: number): void {
  if (!rfps[chainId]) {
    rfps[chainId] = {};
  }
}

export function createRFPIfNotExists(rfps: RFPsStorage, chainId: number, rfpId: string): void {
  createChainIfNotExists(rfps, chainId);
  if (!rfps[chainId][rfpId]) {
    rfps[chainId][rfpId] = {
      budget: [],
      creator: zeroAddress,
      deadline: BigInt(0),
      disputeManager: zeroAddress,
      escrow: zeroAddress,
      manager: zeroAddress,
      metadata: "",
      projects: {},
      tasksManager: zeroAddress,

      events: [],
      cachedMetadata: "",
      usdValue: 0,
    };
  }
}

export function createProjectIfNotExists(rfps: RFPsStorage, chainId: number, rfpId: string, projectId: number): void {
  createRFPIfNotExists(rfps, chainId, rfpId);
  if (!rfps[chainId][rfpId].projects[projectId]) {
    rfps[chainId][rfpId].projects[projectId] = {
      accepted: false,
      deadline: BigInt(0),
      metadata: "",
      nativeReward: [],
      representative: zeroAddress,
      reward: [],

      taskId: BigInt(0),
      cachedMetadata: "",
      usdValue: 0,
    };
  }
}

export function addEvent(rfp: IndexedRFP, event: RFPEvent): void {
  rfp.events.push({ chainId: event.chainId, transactionHash: event.transactionHash, logIndex: event.logIndex });
}
