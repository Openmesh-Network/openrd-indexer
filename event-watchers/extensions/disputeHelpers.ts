import { DisputesStorage } from "../../types/storage.js";

export function createDisputeNetworkIfNotExists(disputes: DisputesStorage, chainId: number): void {
  if (!disputes[chainId]) {
    disputes[chainId] = {};
  }
}

export function createDisputeTaskIfNotExists(disputes: DisputesStorage, chainId: number, taskId: string): void {
  createDisputeNetworkIfNotExists(disputes, chainId);
  if (!disputes[chainId][taskId]) {
    disputes[chainId][taskId] = [];
  }
}
