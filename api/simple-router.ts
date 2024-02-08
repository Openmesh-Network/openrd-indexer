import { Express, Response } from "express";

import { Storage } from "..";
import { IndexedTask } from "../types/tasks";
import { replacer } from "../utils/json";
import { parseBigInt } from "../utils/parseBigInt";

function malformedRequest(res: Response, error: string): void {
  res.statusCode = 400;
  res.end(error);
}

export function registerRoutes(app: Express, storage: Storage) {
  const basePath = "/api/";

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

  // Get total task count
  app.get(basePath + "totalTasks", async function (_, res) {
    const tasks = await storage.tasks.get();
    const totalTasks = Object.values(tasks)
      .map((chainTasks) => Object.keys(chainTasks))
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
}
