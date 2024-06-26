import axios from "axios";
import { Chain, erc20Abi, formatUnits } from "viem";

import { ERC20Transfer } from "../types/tasks.js";
import { publicClients } from "./chain-cache.js";
import { normalizeAddress } from "./normalize-address.js";

export async function getPrice(chain: Chain, nativeBudget: bigint, budget: ERC20Transfer[]): Promise<number> {
  // Example native MATIC: https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd
  // Example polygon USDC: https://api.coingecko.com/api/v3/simple/token_price/polygon-pos?contract_addresses=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359&vs_currencies=usd
  let total = 0;
  if (chain.testnet) {
    return 0;
  }

  if (nativeBudget > BigInt(0)) {
    const coinId = getCoinOfChain(chain.id);
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
    const nativePrice = parseFloat(response.data[coinId].usd);
    if (Number.isNaN(nativePrice)) {
      console.warn(`Getting price for ${coinId} returned Nan: ${JSON.stringify(response.data)}`);
    } else {
      const nativeAmount = formatUnits(nativeBudget, chain.nativeCurrency.decimals);
      total += nativePrice * parseFloat(nativeAmount);
    }
  }

  if (budget.length > 0) {
    const tokens = budget.map((erc20) => normalizeAddress(erc20.tokenContract)).join(",");
    const tokenId = getTokenIdOfChain(chain.id);
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${tokenId}?contract_addresses=${tokens}&vs_currencies=usd`);
    if (response.status !== 200) {
      console.error("CoingGecko error", response);
    }
    await Promise.all(
      budget.map(async (erc20) => {
        try {
          const decimals = await publicClients[chain.id].readContract({
            abi: erc20Abi,
            address: erc20.tokenContract,
            functionName: "decimals",
          });
          const tokenPrice = parseFloat(response.data[normalizeAddress(erc20.tokenContract)].usd);
          if (Number.isNaN(tokenPrice)) {
            console.warn(`Getting price for ${tokenId}-${erc20.tokenContract} returned Nan: ${JSON.stringify(response.data)}`);
          } else {
            const tokenAmount = formatUnits(erc20.amount, decimals);
            total += tokenPrice * parseFloat(tokenAmount);
          }
        } catch (err) {
          console.log(`Error getting token decimals ${tokenId}-${erc20.tokenContract}: ${err}`);
        }
      })
    );
  }

  return total;
}

function getCoinOfChain(chainId: number): string {
  switch (chainId) {
    case 1:
      return "ethereum";
    case 137:
      return "matic-network";
  }

  throw new Error(`Unknown coin for chain ${chainId}`);
}

function getTokenIdOfChain(chainId: number): string {
  switch (chainId) {
    case 1:
      return "ethereum";
    case 137:
      return "polygon-pos";
  }

  throw new Error(`Unknown token id for chain ${chainId}`);
}
