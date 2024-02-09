import { Chain } from "viem";

import { ContractWatcher } from "./contract-watcher";

export interface ChainWatchInfo {
  chain: Chain;
  infuraPrefix: string;
}

export class MultischainWatcher {
  private chainWatchers: {
    [chainId: number]: ContractWatcher;
  };

  constructor(chains: ChainWatchInfo[]) {
    this.chainWatchers = chains.reduce((acc, chainInfo) => {
      acc[chainInfo.chain.id] = new ContractWatcher({
        chain: chainInfo.chain,
        httpRPC: `https://${chainInfo.infuraPrefix}.infura.io/v3/${process.env.INFURA_API_KEY}`,
        websocketRPC: `wss://${chainInfo.infuraPrefix}.infura.io/ws/v3/${process.env.INFURA_API_KEY}`,
      });
      return acc;
    }, {} as typeof this.chainWatchers);
  }

  public forEach(fn: (contractWatcher: ContractWatcher) => void) {
    Object.values(this.chainWatchers).forEach(fn);
  }
}
