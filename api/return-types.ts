import { RFPEvent } from "../types/rfp-events.js";
import { IndexedRFP } from "../types/rfp.js";
import { TaskEvent } from "../types/task-events.js";
import { Dispute, IndexedDraft, IndexedTask } from "../types/tasks.js";
import { User } from "../types/user.js";

export type TaskReturn = IndexedTask;

export type EventReturn = TaskEvent;

export type UserReturn = User;

export type FilterTasksReturn = { chainId: number; taskId: bigint }[];

export type UserEventsReturn = number[];

export interface TotalTasksReturn {
  totalTasks: number;
}

export interface TotalEventsReturn {
  totalEvents: number;
}

export interface TotalUsersReturn {
  totalUsers: number;
}

export interface TotalUsdValueReturn {
  totalUsdValue: number;
}

export type DisputesReturn = Dispute[];

export type DraftsReturn = IndexedDraft[];

export type RFPReturn = IndexedRFP;

export type RFPEventReturn = RFPEvent;

export type UserRFPEventsReturn = number[];

export interface TotalRFPsReturn {
  totalRFPs: number;
}

export interface TotalRFPEventsReturn {
  totalRFPEvents: number;
}
