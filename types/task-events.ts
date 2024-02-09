import { Address } from "viem";

import { ERC20Transfer, NativeReward, RequestType, Reward, SubmissionJudgement, TaskCompletionSource } from "./tasks";

export interface TaskEvent {
  type:
    | "TaskCreated"
    | "ApplicationCreated"
    | "ApplicationAccepted"
    | "TaskTaken"
    | "SubmissionCreated"
    | "SubmissionReviewed"
    | "TaskCompleted"
    | "CancelTaskRequested"
    | "TaskCancelled"
    | "RequestAccepted"
    | "RequestExecuted"
    | "DeadlineChanged"
    | "BudgetChanged"
    | "MetadataChanged"
    | "ManagerChanged"
    | "PartialPayment";
  blockNumber: bigint;
  transactionHash: string;
  chainId: number;
  address: Address;
}

export interface TaskCreated extends TaskEvent {
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

export interface ApplicationCreated extends TaskEvent {
  type: "ApplicationCreated";
  taskId: bigint;
  applicationId: number;
  metadata: string;
  applicant: Address;
  nativeReward: NativeReward[];
  reward: Reward[];
}

export interface ApplicationAccepted extends TaskEvent {
  type: "ApplicationAccepted";
  taskId: bigint;
  applicationId: number;
}

export interface TaskTaken extends TaskEvent {
  type: "TaskTaken";
  taskId: bigint;
  applicationId: number;
}

export interface SubmissionCreated extends TaskEvent {
  type: "SubmissionCreated";
  taskId: bigint;
  submissionId: number;
  metadata: string;
}

export interface SubmissionReviewed extends TaskEvent {
  type: "SubmissionReviewed";
  taskId: bigint;
  submissionId: number;
  judgement: SubmissionJudgement;
  feedback: string;
}

export interface TaskCompleted extends TaskEvent {
  type: "TaskCompleted";
  taskId: bigint;
  source: TaskCompletionSource;
}

export interface CancelTaskRequested extends TaskEvent {
  type: "CancelTaskRequested";
  taskId: bigint;
  requestId: number;
  metadata: string;
}

export interface TaskCancelled extends TaskEvent {
  type: "TaskCancelled";
  taskId: bigint;
}

export interface RequestAccepted extends TaskEvent {
  type: "RequestAccepted";
  taskId: bigint;
  requestType: RequestType;
  requestId: number;
}

export interface RequestExecuted extends TaskEvent {
  type: "RequestExecuted";
  taskId: bigint;
  requestType: RequestType;
  requestId: number;
  by: Address;
}

export interface DeadlineChanged extends TaskEvent {
  type: "DeadlineChanged";
  taskId: bigint;
  newDeadline: bigint;
}

export interface BudgetChanged extends TaskEvent {
  type: "BudgetChanged";
  taskId: bigint;
}

export interface MetadataChanged extends TaskEvent {
  type: "MetadataChanged";
  taskId: bigint;
  newMetadata: string;
}

export interface ManagerChanged extends TaskEvent {
  type: "ManagerChanged";
  taskId: bigint;
  newManager: Address;
}

export interface PartialPayment extends TaskEvent {
  type: "PartialPayment";
  taskId: bigint;
  partialNativeReward: bigint[];
  partialReward: bigint[];
}
