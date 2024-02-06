import { Address } from "viem"

export interface ERC20Transfer {
  tokenContract: Address
  amount: bigint
}

export interface NativeReward {
  to: Address
  amount: bigint
}

export interface Reward {
  nextToken: boolean
  to: Address
  amount: bigint
}

export interface Application {
  metadata: string
  applicant: Address
  accepted: boolean
  nativeReward: NativeReward[]
  reward: Reward[]

  cachedMetadata: string
}

export interface PreapprovedApplication {
  applicant: Address
  nativeReward: NativeReward[]
  reward: Reward[]
}

export enum SubmissionJudgement {
  None,
  Accepted,
  Rejected,
}

export interface Submission {
  metadata: string
  feedback: string
  judgement: SubmissionJudgement

  cachedMetadata: string
  cachedFeedback: string
}

export enum RequestType {
  CancelTask,
}

export interface Request {
  accepted: boolean
  executed: boolean
}

export interface CancelTaskRequest {
  request: Request
  metadata: string

  cachedMetadata: string
}

export enum TaskState {
  Open,
  Taken,
  Closed,
}

export interface Task {
  metadata: string
  deadline: bigint
  executorApplication: number
  manager: Address
  disputeManager: Address
  creator: Address
  state: TaskState
  escrow: Address
  nativeBudget: bigint
  budget: ERC20Transfer[]
  applications: { [applicationId: number]: Application }
  submissions: { [submissionId: number]: Submission }
  cancelTaskRequests: { [requestId: number]: CancelTaskRequest }

  completionSource?: TaskCompletionSource
  events: number[]
  cachedMetadata: string
  usdValue: number
  nativePaidOut: bigint[]
  paidOut: bigint[]
}

export enum TaskCompletionSource {
  SubmissionAccepted,
  Dispute,
}
