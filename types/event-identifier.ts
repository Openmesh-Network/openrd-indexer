import { Hex } from "viem";

export interface EventIdentifier {
  chainId: number;
  transactionHash: Hex;
  logIndex: number;
}
