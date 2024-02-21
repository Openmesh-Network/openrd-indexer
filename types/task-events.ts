import { Address } from "viem";

import { ERC20Transfer, NativeReward, RequestType, Reward, SubmissionJudgement, TaskCompletionSource } from "./tasks";

export interface TaskEventBase {
  blockNumber: bigint;
  transactionHash: string;
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
  | PartialPayment;

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
