import { zeroAddress } from "viem";

import { TasksStorage } from "..";
import { IndexedTask, Request, RequestType, SubmissionJudgement, TaskState } from "../types/tasks.js";

export function createNetworkIfNotExists(tasks: TasksStorage, chainId: number): void {
  if (!tasks[chainId]) {
    tasks[chainId] = {};
  }
}

export function createTaskIfNotExists(tasks: TasksStorage, chainId: number, taskId: string): void {
  createNetworkIfNotExists(tasks, chainId);
  if (!tasks[chainId][taskId]) {
    tasks[chainId][taskId] = {
      applications: [],
      budget: [],
      cancelTaskRequests: [],
      creator: zeroAddress,
      deadline: BigInt(0),
      disputeManager: zeroAddress,
      escrow: zeroAddress,
      executorApplication: 0,
      manager: zeroAddress,
      metadata: "",
      nativeBudget: BigInt(0),
      state: TaskState.Open,
      submissions: [],

      createdAt: Math.round(new Date().getTime() / 1000),
      lastUpdated: Math.round(new Date().getTime() / 1000),
      events: [],
      cachedMetadata: "",
      usdValue: 0,
      nativePaidOut: [],
      paidOut: [],
    };
  }
}

export function createApplicationIfNotExists(tasks: TasksStorage, chainId: number, taskId: string, applicationId: number): void {
  createTaskIfNotExists(tasks, chainId, taskId);
  if (!tasks[chainId][taskId].applications[applicationId]) {
    tasks[chainId][taskId].applications[applicationId] = {
      accepted: false,
      applicant: zeroAddress,
      metadata: "",
      nativeReward: [],
      reward: [],

      cachedMetadata: "",
    };
  }
}

export function createSubmissionIfNotExists(tasks: TasksStorage, chainId: number, taskId: string, submissionId: number): void {
  createTaskIfNotExists(tasks, chainId, taskId);
  if (!tasks[chainId][taskId].submissions[submissionId]) {
    tasks[chainId][taskId].submissions[submissionId] = {
      feedback: "",
      judgement: SubmissionJudgement.None,
      metadata: "",

      cachedFeedback: "",
      cachedMetadata: "",
    };
  }
}

export function createCancelTaskRequestIfNotExists(tasks: TasksStorage, chainId: number, taskId: string, requestId: number): void {
  createTaskIfNotExists(tasks, chainId, taskId);
  if (!tasks[chainId][taskId].cancelTaskRequests[requestId]) {
    tasks[chainId][taskId].cancelTaskRequests[requestId] = {
      metadata: "",
      request: {
        accepted: false,
        executed: false,
      },

      cachedMetadata: "",
    };
  }
}

export function getRequest(tasks: TasksStorage, chainId: number, taskId: string, requestType: RequestType, requestId: number): Request | undefined {
  switch (requestType) {
    case RequestType.CancelTask:
      createCancelTaskRequestIfNotExists(tasks, chainId, taskId, requestId);
      return tasks[chainId][taskId].cancelTaskRequests[requestId].request;
  }
}

export function addEvent(task: IndexedTask, event: number): void {
  task.events.push(event);
  task.lastUpdated = Math.round(new Date().getTime() / 1000);
}
