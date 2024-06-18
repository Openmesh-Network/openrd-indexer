import { TaskEvent } from "./task-events.js";
import { IndexedDispute, IndexedDraft, IndexedTask } from "./tasks.js";
import { User } from "./user.js";
import { IndexedRFP } from "./rfp.js";
import { RFPEvent } from "./rfp-events.js";
import { Address, Hex } from "viem";
import { PersistentJson } from "../utils/persistent-json.js";

export interface TasksStorage {
  [chainId: number]: {
    [taskId: string]: IndexedTask;
  };
}
export type TasksEventsStorage = {
  [chainId: number]: {
    [transactionHash: Hex]: {
      [logIndex: number]: TaskEvent;
    };
  };
};
export interface UsersStorage {
  [address: Address]: User;
}

export interface DisputesStorage {
  [chainId: number]: {
    [taskId: string]: IndexedDispute[];
  };
}
export interface DraftsStorage {
  [chainId: number]: {
    [dao: Address]: IndexedDraft[];
  };
}

export interface RFPsStorage {
  [chainId: number]: {
    [rfpId: string]: IndexedRFP;
  };
}
export type RFPsEventsStorage = {
  [chainId: number]: {
    [transactionHash: Hex]: {
      [logIndex: number]: RFPEvent;
    };
  };
};

export interface Storage {
  tasks: PersistentJson<TasksStorage>;
  tasksEvents: PersistentJson<TasksEventsStorage>;
  users: PersistentJson<UsersStorage>;

  disputes: PersistentJson<DisputesStorage>;
  drafts: PersistentJson<DraftsStorage>;

  rfps: PersistentJson<RFPsStorage>;
  rfpsEvents: PersistentJson<RFPsEventsStorage>;
}
