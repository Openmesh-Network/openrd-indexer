import { Abi, Chain, ContractEventName, createPublicClient, PublicClient, WatchContractEventParameters, webSocket } from "viem";

import { chains, publicClients } from "./chain-cache.js";

export class ContractWatcher {
  public chain: Chain;
  private client: PublicClient;
  private watching: {
    [watchId: string]: { start: () => void; stop: () => void };
  };

  public getWatched(): string[] {
    return Object.keys(this.watching);
  }

  private refresh(): void {
    this.getWatched().forEach((watchId) => {
      this.watching[watchId].stop();
      this.watching[watchId].start();
    });
  }

  constructor({ chain, rpc }: { chain: Chain; rpc: string }) {
    this.chain = chain;
    this.client = createPublicClient({
      chain: this.chain,
      transport: webSocket(`wss://${rpc}`),
    });
    this.watching = {};
    setInterval(() => {
      // Wrapped in a function to have the correct "this"
      try {
        this.refresh();
      } catch (err) {
        console.error(`Refreshing contract watcher ${this.chain.id} error: ${err}`);
      }
    }, 60 * 60 * 1000); // Start refresh loop to keep connection alive

    // Expose this info for other classes to use
    chains[this.chain.id] = this.chain;
    publicClients[this.chain.id] = this.client;
  }

  public startWatching<
    abi extends Abi | readonly unknown[] = Abi,
    eventName extends ContractEventName<abi> | undefined = ContractEventName<abi>,
    strict extends boolean | undefined = undefined
  >(watchId: string, parameters: Omit<WatchContractEventParameters<abi, eventName, strict>, "onError">): void {
    if (this.watching[watchId]) {
      this.watching[watchId].stop();
    }

    this.watching[watchId] = {
      start: () => {
        this.watching[watchId].stop = this.client.watchContractEvent({
          ...parameters,
          onError: (err) => {
            console.error(`Watching ${watchId} error: ${err.message}`);
            this.watching[watchId].stop();
            this.watching[watchId].start();
          },
        });
      },
      stop: () => {},
    };

    this.watching[watchId].start();
  }

  public stopWatching(watchId: string): void {
    if (!this.watching[watchId]) {
      throw new Error(`Tried to remove ${watchId}, but its not being watched.`);
    }

    this.watching[watchId].stop();
    delete this.watching[watchId];
  }

  public stopAll(): void {
    this.getWatched().forEach((watchId) => {
      this.stopWatching(watchId);
    });
  }
}
