import { Address, Hex } from "viem";

import { ERC20Transfer, NativeReward, PreapprovedApplication, RequestType, Reward, SubmissionJudgement, TaskCompletionSource } from "./tasks.js";

export interface TaskEventBase {
  blockNumber: bigint;
  transactionHash: Hex;
  chainId: number;
  address: Address;
}

export type TaskEvent =
  | TaskCreated
  | ApplicationCreated
  | ApplicationAccepted
  | TaskTaken
  | SubmissionCreated
  | SubmissionReviewed
  | TaskCompleted
  | CancelTaskRequested
  | TaskCancelled
  | RequestAccepted
  | RequestExecuted
  | DeadlineChanged
  | BudgetChanged
  | RewardIncreased
  | MetadataChanged
  | ManagerChanged
  | PartialPayment
  | DisputeCreated
  | DraftCreated;

export interface TaskCreated extends TaskEventBase {
  type: "TaskCreated";
  taskId: bigint;
  metadata: string;
  deadline: bigint;
  manager: Address;
  disputeManager: Address;
  creator: Address;
  nativeBudget: bigint;
  budget: readonly ERC20Transfer[];
  escrow: Address;
}

export interface ApplicationCreated extends TaskEventBase {
  type: "ApplicationCreated";
  taskId: bigint;
  applicationId: number;
  metadata: string;
  applicant: Address;
  nativeReward: NativeReward[];
  reward: Reward[];
}

export interface ApplicationAccepted extends TaskEventBase {
  type: "ApplicationAccepted";
  taskId: bigint;
  applicationId: number;
}

export interface TaskTaken extends TaskEventBase {
  type: "TaskTaken";
  taskId: bigint;
  applicationId: number;
}

export interface SubmissionCreated extends TaskEventBase {
  type: "SubmissionCreated";
  taskId: bigint;
  submissionId: number;
  metadata: string;
}

export interface SubmissionReviewed extends TaskEventBase {
  type: "SubmissionReviewed";
  taskId: bigint;
  submissionId: number;
  judgement: SubmissionJudgement;
  feedback: string;
}

export interface TaskCompleted extends TaskEventBase {
  type: "TaskCompleted";
  taskId: bigint;
  source: TaskCompletionSource;
}

export interface CancelTaskRequested extends TaskEventBase {
  type: "CancelTaskRequested";
  taskId: bigint;
  requestId: number;
  metadata: string;
}

export interface TaskCancelled extends TaskEventBase {
  type: "TaskCancelled";
  taskId: bigint;
}

export interface RequestAccepted extends TaskEventBase {
  type: "RequestAccepted";
  taskId: bigint;
  requestType: RequestType;
  requestId: number;
}

export interface RequestExecuted extends TaskEventBase {
  type: "RequestExecuted";
  taskId: bigint;
  requestType: RequestType;
  requestId: number;
  by: Address;
}

export interface DeadlineChanged extends TaskEventBase {
  type: "DeadlineChanged";
  taskId: bigint;
  newDeadline: bigint;
}

export interface BudgetChanged extends TaskEventBase {
  type: "BudgetChanged";
  taskId: bigint;
}

export interface RewardIncreased extends TaskEventBase {
  type: "RewardIncreased";
  taskId: bigint;
  applicationId: number;
  nativeIncrease: bigint[];
  increase: bigint[];
}

export interface MetadataChanged extends TaskEventBase {
  type: "MetadataChanged";
  taskId: bigint;
  newMetadata: string;
}

export interface ManagerChanged extends TaskEventBase {
  type: "ManagerChanged";
  taskId: bigint;
  newManager: Address;
}

export interface PartialPayment extends TaskEventBase {
  type: "PartialPayment";
  taskId: bigint;
  partialNativeReward: bigint[];
  partialReward: bigint[];
}

export interface DisputeCreated extends TaskEventBase {
  type: "DisputeCreated";
  dao: Address;
  trustlessActions: Address;
  actionId: bigint;

  dispute?: {
    taskId: bigint;
    partialNativeReward: bigint[];
    partialReward: bigint[];
  };
}

export interface DraftCreated extends TaskEventBase {
  type: "TaskDraftCreated";
  dao: Address;
  trustlessActions: Address;
  actionId: bigint;

  info?: {
    metadata: string;
    deadline: bigint;
    manager: Address;
    disputeManager: Address;
    nativeBudget: bigint;
    budget: ERC20Transfer[];
    preapproved: PreapprovedApplication[];
  };
}
