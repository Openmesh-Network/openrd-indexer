import { EventIdentifier } from "../types/event-identifier.js";
import { RFPEvent } from "../types/rfp-events.js";
import { IndexedRFP } from "../types/rfp.js";
import { TaskEvent } from "../types/task-events.js";
import { IndexedDispute, IndexedDraft, IndexedTask } from "../types/tasks.js";
import { User } from "../types/user.js";

export type TaskReturn = IndexedTask;

export type EventReturn = TaskEvent;

export type UserReturn = User;

export type FilterTasksReturn = { chainId: number; taskId: bigint }[];

export type UserEventsReturn = EventIdentifier[];

export interface TotalTasksReturn {
  totalTasks: number;
}

export type RecentEventsReturn = TaskEvent[];

export interface TotalUsersReturn {
  totalUsers: number;
}

export interface TotalUsdValueReturn {
  totalUsdValue: number;
}

export type DisputesReturn = IndexedDispute[];

export type DraftsReturn = IndexedDraft[];

export type RFPReturn = IndexedRFP;

export type RFPEventReturn = RFPEvent;

export type UserRFPEventsReturn = number[];

export type FilterRFPsReturn = { chainId: number; rfpId: bigint }[];

export interface TotalRFPsReturn {
  totalRFPs: number;
}

export type RecentRFPEventsReturn = RFPEvent[];
