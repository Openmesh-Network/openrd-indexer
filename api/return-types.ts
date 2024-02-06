import { TaskEvent } from "../types/task-events"
import { Task } from "../types/tasks"

export type TaskReturn = Task

export type EventReturn = TaskEvent

export interface TotalTasksReturn {
  totalTasks: number
}

export interface TotalEventsReturn {
  totalEvents: number
}

export interface TotalUsersReturn {
  totalUsers: number
}

export interface TotalUsdValueReturn {
  totalUsdValue: number
}
