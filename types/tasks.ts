import { Address } from "viem";

export interface ERC20Transfer {
  tokenContract: Address;
  amount: bigint;
}

export interface NativeReward {
  to: Address;
  amount: bigint;
}

export interface Reward {
  nextToken: boolean;
  to: Address;
  amount: bigint;
}

export interface Application {
  metadata: string;
  applicant: Address;
  accepted: boolean;
  nativeReward: NativeReward[];
  reward: Reward[];
}

export interface IndexedApplication extends Application {
  cachedMetadata: string;
}

export interface PreapprovedApplication {
  applicant: Address;
  nativeReward: NativeReward[];
  reward: Reward[];
}

export enum SubmissionJudgement {
  None,
  Accepted,
  Rejected,
}

export interface Submission {
  metadata: string;
  feedback: string;
  judgement: SubmissionJudgement;
}

export interface IndexedSubmission extends Submission {
  cachedMetadata: string;
  cachedFeedback: string;
}

export enum RequestType {
  CancelTask,
}

export interface Request {
  accepted: boolean;
  executed: boolean;
}

export interface CancelTaskRequest {
  request: Request;
  metadata: string;
}

export interface IndexedCancelTaskRequest extends CancelTaskRequest {
  cachedMetadata: string;
}

export enum TaskState {
  Open,
  Taken,
  Closed,
}

export interface Task {
  metadata: string;
  deadline: bigint;
  executorApplication: number;
  manager: Address;
  disputeManager: Address;
  creator: Address;
  state: TaskState;
  escrow: Address;
  nativeBudget: bigint;
  budget: ERC20Transfer[];
  applications: { [applicationId: number]: Application };
  submissions: { [submissionId: number]: Submission };
  cancelTaskRequests: { [requestId: number]: CancelTaskRequest };
}

export interface IndexedTask extends Task {
  applications: { [applicationId: number]: IndexedApplication };
  submissions: { [submissionId: number]: IndexedSubmission };
  cancelTaskRequests: { [requestId: number]: IndexedCancelTaskRequest };

  completionSource?: TaskCompletionSource;
  createdAt: number;
  lastUpdated: number;
  events: number[];
  cachedMetadata: string;
  usdValue: number;
  nativePaidOut: bigint[];
  paidOut: bigint[];
}

export enum TaskCompletionSource {
  SubmissionAccepted,
  Dispute,
}

export interface Dispute {
  partialNativeReward: bigint[];
  partialReward: bigint[];
  governancePlugin: Address;
  proposalId: bigint;
}

export interface Draft {
  metadata: string;
  deadline: bigint;
  manager: Address;
  disputeManager: Address;
  nativeBudget: bigint;
  budget: ERC20Transfer[];
  preapproved: PreapprovedApplication[];

  governancePlugin: Address;
  proposalId: bigint;
}

export interface IndexedDraft extends Draft {
  cachedMetadata: string;
}
