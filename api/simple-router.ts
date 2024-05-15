import { Express, Response, json } from "express";
import { isAddress } from "viem";

import { Storage } from "../types/storage.js";
import { IndexedTask } from "../types/tasks.js";
import { replacer, reviver } from "../utils/json.js";
import { parseBigInt } from "../utils/parseBigInt.js";
import { createUserIfNotExists } from "../event-watchers/userHelpers.js";
import { ObjectFilter, passesObjectFilter } from "./filter.js";
import { fetchMetadata } from "../utils/metadata-fetch.js";
import { publicClients } from "../utils/chain-cache.js";
import { normalizeAddress } from "../utils/normalize-address.js";

function malformedRequest(res: Response, error: string): void {
  res.statusCode = 400;
  res.end(error);
}

export function registerRoutes(app: Express, storage: Storage) {
  const basePath = "/indexer/";
  app.use(json());

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
  app.post(basePath + "filterTasks", async function (req, res) {
    try {
      const filter: ObjectFilter = JSON.parse(JSON.stringify(req.body), reviver);

      const tasks = await storage.tasks.get();
      const filterTasks = Object.keys(tasks)
        .map((chainId) =>
          Object.keys(tasks[chainId as any as number]).map((taskId) => {
            return { chainId: parseInt(chainId), taskId: BigInt(taskId) };
          })
        )
        .flat(1)
        .filter((taskInfo) => {
          const task = {
            ...taskInfo,
            ...tasks[taskInfo.chainId][taskInfo.taskId.toString()],
          };
          try {
            task.cachedMetadata = JSON.parse(task.cachedMetadata, reviver);
          } catch {
            task.cachedMetadata = {} as any; // cachedMetadata should be an object for filtering
          }
          return passesObjectFilter(task, filter);
        })
        .sort(
          (taskInfo1, taskInfo2) =>
            tasks[taskInfo2.chainId][taskInfo2.taskId.toString()].lastUpdated - tasks[taskInfo1.chainId][taskInfo1.taskId.toString()].lastUpdated
        );

      res.end(JSON.stringify(filterTasks, replacer));
    } catch (error: any) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error?.message ?? "Unknown error" }));
    }
  });

  // Get single user events
  app.get(basePath + "userEvents/:address", async function (req, res) {
    const address = req.params.address;
    if (!isAddress(address)) {
      return malformedRequest(res, "address is not a valid address");
    }

    const users = await storage.users.get();
    const tasks = await storage.tasks.get();
    const user = users[normalizeAddress(address)];

    if (!user) {
      res.statusCode = 404;
      return res.end("User not found");
    }

    const userEvents = Object.keys(user.tasks)
      .map((chainId) =>
        Object.keys(user.tasks[chainId as any as number]).map((taskId) => {
          return { chainId: parseInt(chainId), taskId: BigInt(taskId) };
        })
      )
      .flat(1)
      .flatMap((taskInfo) => tasks[taskInfo.chainId][taskInfo.taskId.toString()].events);

    res.end(JSON.stringify(userEvents, replacer));
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

  // Update the metadata of a user
  app.post(basePath + "setMetadata", async function (req, res) {
    try {
      const account = req.body.account;
      const metadataUri = req.body.metadata;
      const signature = req.body.signature;
      const valid = await Promise.all(
        Object.values(publicClients).map((publicClient) =>
          publicClient.verifyMessage({ address: account, message: `OpenR&D metadata: ${metadataUri}`, signature: signature })
        )
      );
      if (!valid.some((b) => b)) {
        // No single chain that approved this signature
        return malformedRequest(res, "signature is not valid");
      }

      const metadata = await fetchMetadata(metadataUri);
      await storage.users.update((users) => {
        const address = normalizeAddress(account);
        createUserIfNotExists(users, address);
        users[address].metadata = metadata;
      });
      res.end(JSON.stringify({ success: true }));
    } catch (error: any) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error?.message ?? "Unknown error" }));
    }
  });

  // Get disputes of single task
  app.get(basePath + "disputes/:chainId/:taskId", async function (req, res) {
    const chainId = parseInt(req.params.chainId);
    if (Number.isNaN(chainId)) {
      return malformedRequest(res, "chainId is not a valid number");
    }

    const taskId = parseBigInt(req.params.taskId);
    if (taskId === undefined) {
      return malformedRequest(res, "taskId is not a valid bigint");
    }

    const disputes = await storage.disputes.get();
    if (!disputes[chainId]) {
      res.statusCode = 404;
      return res.end("Chain not found");
    }

    const taskDisputes = disputes[chainId][taskId.toString()];
    if (!taskDisputes) {
      res.statusCode = 404;
      return res.end("Task disputes not found");
    }

    res.end(JSON.stringify(taskDisputes, replacer));
  });

  // Get drafts of single dao
  app.get(basePath + "drafts/:chainId/:dao", async function (req, res) {
    const chainId = parseInt(req.params.chainId);
    if (Number.isNaN(chainId)) {
      return malformedRequest(res, "chainId is not a valid number");
    }

    const dao = req.params.dao;
    if (!isAddress(dao)) {
      return malformedRequest(res, "dao is not a valid address");
    }

    const drafts = await storage.drafts.get();
    if (!drafts[chainId]) {
      res.statusCode = 404;
      return res.end("Chain not found");
    }

    const taskDrafts = drafts[chainId][normalizeAddress(dao)];
    if (!taskDrafts) {
      res.statusCode = 404;
      return res.end("Task drafts not found");
    }

    res.end(JSON.stringify(taskDrafts, replacer));
  });

  // Get single rfp
  app.get(basePath + "rfp/:chainId/:rfpId", async function (req, res) {
    const chainId = parseInt(req.params.chainId);
    if (Number.isNaN(chainId)) {
      return malformedRequest(res, "chainId is not a valid number");
    }

    const rfpId = parseBigInt(req.params.rfpId);
    if (rfpId === undefined) {
      return malformedRequest(res, "rfpId is not a valid bigint");
    }

    const rfps = await storage.rfps.get();
    if (!rfps[chainId]) {
      res.statusCode = 404;
      return res.end("Chain not found");
    }

    const rfp = rfps[chainId][rfpId.toString()];
    if (!rfp) {
      res.statusCode = 404;
      return res.end("RFP not found");
    }

    res.end(JSON.stringify(rfp, replacer));
  });

  // Get single rfp event (newer events have higher index)
  app.get(basePath + "rfpEvent/:eventIndex", async function (req, res) {
    const eventIndex = parseInt(req.params.eventIndex);
    if (Number.isNaN(eventIndex)) {
      return malformedRequest(res, "eventIndex is not a valid number");
    }

    const rfpsEvents = await storage.rfpsEvents.get();
    const event = rfpsEvents[eventIndex];

    if (!event) {
      res.statusCode = 404;
      return res.end("RFP event not found");
    }

    res.end(JSON.stringify(event, replacer));
  });

  // Get all tasks that pass a certain filter
  app.post(basePath + "filterRFPs", async function (req, res) {
    try {
      const filter: ObjectFilter = JSON.parse(JSON.stringify(req.body), reviver);

      const rfps = await storage.rfps.get();
      const filterRFPs = Object.keys(rfps)
        .map((chainId) =>
          Object.keys(rfps[chainId as any as number]).map((rfpId) => {
            return { chainId: parseInt(chainId), rfpId: BigInt(rfpId) };
          })
        )
        .flat(1)
        .filter((rfpInfo) => {
          const rfp = {
            ...rfpInfo,
            ...rfps[rfpInfo.chainId][rfpInfo.rfpId.toString()],
          };
          try {
            rfp.cachedMetadata = JSON.parse(rfp.cachedMetadata, reviver);
          } catch {
            rfp.cachedMetadata = {} as any; // cachedMetadata should be an object for filtering
          }
          return passesObjectFilter(rfp, filter);
        })
        .sort(
          (rfpInfo1, rfpInfo2) => rfps[rfpInfo2.chainId][rfpInfo2.rfpId.toString()].lastUpdated - rfps[rfpInfo1.chainId][rfpInfo1.rfpId.toString()].lastUpdated
        );

      res.end(JSON.stringify(filterRFPs, replacer));
    } catch (error: any) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error?.message ?? "Unknown error" }));
    }
  });

  // Get total rfp count
  app.get(basePath + "totalRFPs", async function (_, res) {
    const rfps = await storage.rfps.get();
    const totalRFPs = Object.values(rfps)
      .map((chainRFPs) => Object.values(chainRFPs))
      .flat(1).length;

    res.end(JSON.stringify({ totalRFPs: totalRFPs }));
  });

  // Get total rfp event count
  app.get(basePath + "totalRFPEvents", async function (_, res) {
    const rfpsEvents = await storage.rfpsEvents.get();
    const totalEvents = rfpsEvents.length;

    res.end(JSON.stringify({ totalRFPEvents: totalEvents }));
  });
}
