import { TaskEvent } from "../types/task-events";
import { IndexedTask } from "../types/tasks";
import { User } from "../types/user";

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
