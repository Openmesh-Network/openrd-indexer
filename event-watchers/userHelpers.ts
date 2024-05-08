import { Address } from "viem";

import { UsersStorage } from "../types/storage.js";

export function createUserIfNotExists(users: UsersStorage, userAddress: Address): void {
  if (!users[userAddress]) {
    users[userAddress] = {
      metadata: "",
      tasks: {},
    };

    // Smart logic to retrieve metadata based on Address (which should also be callable through the API by the user to refresh)
    // Query Aragon Subgraph ? (DAO metadata)
    // Complicated as smart contracts are not crosschain like EOA
  }
}

export function createUserTaskNetworkIfNotExists(users: UsersStorage, userAddress: Address, chainId: number): void {
  createUserIfNotExists(users, userAddress);
  if (!users[userAddress].tasks[chainId]) {
    users[userAddress].tasks[chainId] = {};
  }
}

export function createUserTaskIfNotExists(users: UsersStorage, userAddress: Address, chainId: number, taskId: string): void {
  createUserTaskNetworkIfNotExists(users, userAddress, chainId);
  if (!users[userAddress].tasks[chainId][taskId]) {
    users[userAddress].tasks[chainId][taskId] = [];
  }
}
