import { Express, Response } from "express";

import { Storage } from "..";
import { IndexedTask, TaskState } from "../types/tasks";
import { replacer, reviver } from "../utils/json";
import { parseBigInt } from "../utils/parseBigInt";
import { isAddress } from "viem";
import { normalizeAddress } from "../event-watchers/userHelpers";
import { ObjectFilter, passesObjectFilter } from "./filter";

function malformedRequest(res: Response, error: string): void {
  res.statusCode = 400;
  res.end(error);
}

export function registerRoutes(app: Express, storage: Storage) {
  const basePath = "/indexer/";

  // Get single task
  app.get(basePath + "task/:chainId/:taskId", async function (req, res) {
    const chainId = parseInt(req.params.chainId);
    if (Number.isNaN(chainId)) {
      return malformedRequest(res, "chainId is not a valid number");
    }

    const taskId = parseBigInt(req.params.taskId);
    if (taskId === undefined) {
      return malformedRequest(res, "taskId is not a valid bigint");
    }

    const tasks = await storage.tasks.get();
    if (!tasks[chainId]) {
      res.statusCode = 404;
      return res.end("Chain not found");
    }

    const task = tasks[chainId][taskId.toString()];
    if (!task) {
      res.statusCode = 404;
      return res.end("Task not found");
    }

    res.end(JSON.stringify(task, replacer));
  });

  // Get single event (newer events have higher index)
  app.get(basePath + "event/:eventIndex", async function (req, res) {
    const eventIndex = parseInt(req.params.eventIndex);
    if (Number.isNaN(eventIndex)) {
      return malformedRequest(res, "eventIndex is not a valid number");
    }

    const tasksEvents = await storage.tasksEvents.get();
    const event = tasksEvents[eventIndex];

    if (!event) {
      res.statusCode = 404;
      return res.end("Event not found");
    }

    res.end(JSON.stringify(event, replacer));
  });

  // Get single user
  app.get(basePath + "user/:address", async function (req, res) {
    const address = req.params.address;
    if (!isAddress(address)) {
      return malformedRequest(res, "address is not a valid address");
    }

    const users = await storage.users.get();
    const user = users[normalizeAddress(address)];

    if (!user) {
      res.statusCode = 404;
      return res.end("User not found");
    }

    res.end(JSON.stringify(user, replacer));
  });

  // Get all tasks that pass a certain filter
  app.get(basePath + "filterTasks/:filter", async function (req, res) {
    try {
      const filter: ObjectFilter = JSON.parse(req.params.filter, reviver);

      const tasks = await storage.tasks.get();
      const filterTasks = Object.keys(tasks)
        .map((chainId) =>
          Object.keys(tasks[chainId as any as number]).map((taskId) => {
            return { chainId: chainId as any as number, taskId: BigInt(taskId) };
          })
        )
        .flat(1)
        .filter((taskInfo) => {
          const task = {
            ...taskInfo,
            ...tasks[taskInfo.chainId][taskInfo.taskId.toString()],
          };
          if (filter.cachedMetadata) {
            task.cachedMetadata = JSON.parse(task.cachedMetadata, reviver);
          }
          return passesObjectFilter(task, filter);
        });

      res.end(JSON.stringify({ filterTasks: filterTasks }));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: JSON.stringify(error) }));
    }
  });

  // Get total task count
  app.get(basePath + "totalTasks", async function (_, res) {
    const tasks = await storage.tasks.get();
    const totalTasks = Object.values(tasks)
      .map((chainTasks) => Object.values(chainTasks))
      .flat(1).length;

    res.end(JSON.stringify({ totalTasks: totalTasks }));
  });

  // Get total event count
  app.get(basePath + "totalEvents", async function (_, res) {
    const tasksEvents = await storage.tasksEvents.get();
    const totalEvents = tasksEvents.length;

    res.end(JSON.stringify({ totalEvents: totalEvents }));
  });

  // Get total user count
  app.get(basePath + "totalUsers", async function (_, res) {
    const users = await storage.users.get();
    const totalUsers = Object.keys(users).length;

    res.end(JSON.stringify({ totalUsers: totalUsers }));
  });

  // Get total usd value of all created tasks
  app.get(basePath + "totalUsdValue", async function (_, res) {
    const tasks = await storage.tasks.get();
    const totalUsdValue = Object.values(tasks)
      .map((chainTasks: { [taskId: string]: IndexedTask }) => Object.values(chainTasks))
      .flat(1)
      .map((task) => task.usdValue)
      .reduce((sum, val) => (sum += val), 0);

    res.end(JSON.stringify({ totalUsdValue: totalUsdValue }));
  });

  // Get total task count with a certain state
  app.get(basePath + "totalTasksWithState/:state", async function (req, res) {
    const state = parseInt(req.params.state);
    if (Number.isNaN(state)) {
      return malformedRequest(res, "state is not a valid number");
    }

    const tasks = await storage.tasks.get();
    const totalTasksWithState = Object.values(tasks)
      .map((chainTasks: { [taskId: string]: IndexedTask }) => Object.values(chainTasks))
      .flat(1)
      .filter((task) => task.state === state).length;

    res.end(JSON.stringify({ totalTasksWithState: totalTasksWithState }));
  });
}
