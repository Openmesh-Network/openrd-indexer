import { Address } from "viem";
import { DraftsStorage } from "../..";

export function createDraftNetworkIfNotExists(drafts: DraftsStorage, chainId: number): void {
  if (!drafts[chainId]) {
    drafts[chainId] = {};
  }
}

export function createDraftDAOIfNotExists(drafts: DraftsStorage, chainId: number, dao: Address): void {
  createDraftNetworkIfNotExists(drafts, chainId);
  if (!drafts[chainId][dao]) {
    drafts[chainId][dao] = [];
  }
}
