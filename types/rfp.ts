import { Address } from "viem";
import { ERC20Transfer, NativeReward, Reward } from "./tasks.js";

export interface Project {
  metadata: string;
  representative: Address;
  deadline: bigint;
  accepted: boolean;
  nativeReward: NativeReward[];
  reward: Reward[];
}

export interface IndexedProject extends Project {
  taskId: bigint;
  cachedMetadata: string;
  usdValue: number;
}

export interface RFP {
  metadata: string;
  deadline: bigint;
  escrow: Address;
  creator: Address;
  tasksManager: Address;
  disputeManager: Address;
  manager: Address;
  budget: { tokenContract: Address }[];
  projects: { [projectId: number]: Project };
}

export interface IndexedRFP extends RFP {
  budget: ERC20Transfer[];
  projects: { [projectId: number]: IndexedProject };

  createdAt: number;
  lastUpdated: number;
  events: number[];
  cachedMetadata: string;
  usdValue: number;
}
