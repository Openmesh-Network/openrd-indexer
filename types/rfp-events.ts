import { Address } from "viem";
import { ERC20Transfer, NativeReward, Reward } from "./tasks.js";
import { EventIdentifier } from "./event-identifier.js";

export interface RFPEventBase extends EventIdentifier {
  blockNumber: bigint;
  address: Address;
  timestamp: bigint;
}

export type RFPEvent = RFPCreated | ProjectSubmitted | ProjectAccepted | RFPEmptied;

export interface RFPCreated extends RFPEventBase {
  type: "RFPCreated";
  rfpId: bigint;
  metadata: string;
  deadline: bigint;
  nativeBudget: bigint;
  budget: readonly ERC20Transfer[];
  creator: Address;
  tasksManager: Address;
  disputeManager: Address;
  manager: Address;
  escrow: Address;
}

export interface ProjectSubmitted extends RFPEventBase {
  type: "ProjectSubmitted";
  rfpId: bigint;
  projectId: number;
  metadata: string;
  representative: Address;
  deadline: bigint;
  nativeReward: readonly NativeReward[];
  reward: readonly Reward[];
}

export interface ProjectAccepted extends RFPEventBase {
  type: "ProjectAccepted";
  rfpId: bigint;
  projectId: number;
  nativeReward: readonly bigint[];
  reward: readonly bigint[];
  taskId: bigint;
}

export interface RFPEmptied extends RFPEventBase {
  type: "RFPEmptied";
  rfpId: bigint;
}
