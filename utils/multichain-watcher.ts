import { Chain } from "viem";

import { ContractWatcher } from "./contract-watcher.js";

export interface ChainWatchInfo {
  chain: Chain;
  rpc?: string;
}

export class MultischainWatcher {
  private chainWatchers: {
    [chainId: number]: ContractWatcher;
  };

  constructor(chains: ChainWatchInfo[]) {
    this.chainWatchers = chains.reduce((acc, chainInfo) => {
      acc[chainInfo.chain.id] = new ContractWatcher({
        chain: chainInfo.chain,
        rpc: chainInfo.rpc ?? this.getRPC(chainInfo.chain),
      });
      return acc;
    }, {} as typeof this.chainWatchers);
  }

  public forEach(fn: (contractWatcher: ContractWatcher) => void) {
    Object.values(this.chainWatchers).forEach(fn);
  }

  private getRPC(chain: Chain): string {
    switch (chain.id) {
      case 1:
        return "eth.drpc.org";
      case 11155111:
        return "sepolia.drpc.org";
      default:
        throw new Error(`Unknown default rpc for chain ${chain.id}`);
    }
  }
}
