import { Hex } from "viem";
import { RFPsEventsStorage, TasksEventsStorage } from "../types/storage.js";
import { publicClients } from "../utils/chain-cache.js";
import { TaskEvent } from "../types/task-events.js";
import { RFPEvent } from "../types/rfp-events.js";

export async function getTimestamp(chainId: number, blockNumber: bigint): Promise<bigint> {
  const publicClient = publicClients[chainId];
  const block = await publicClient.getBlock({ blockNumber: blockNumber });
  return block.timestamp;
}

export function createChainIfNotExists(events: TasksEventsStorage | RFPsEventsStorage, chainId: number): void {
  if (!events[chainId]) {
    events[chainId] = {};
  }
}

export function createTransactionIfNotExists(events: TasksEventsStorage | RFPsEventsStorage, chainId: number, transactionHash: Hex): void {
  createChainIfNotExists(events, chainId);
  if (!events[chainId][transactionHash]) {
    events[chainId][transactionHash] = {};
  }
}

export function addTaskEvent(events: TasksEventsStorage, event: TaskEvent): void {
  createTransactionIfNotExists(events, event.chainId, event.transactionHash);
  events[event.chainId][event.transactionHash][event.logIndex] = event;
}

export function addRFPEvent(events: RFPsEventsStorage, event: RFPEvent): void {
  createTransactionIfNotExists(events, event.chainId, event.transactionHash);
  events[event.chainId][event.transactionHash][event.logIndex] = event;
}
