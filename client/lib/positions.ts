import { simulateContractCall } from './rpc';
import { scValToNative, Address } from '@stellar/stellar-sdk';

export interface UserPosition {
  marketId: string;
  symbol: string;
  supplied: number;
  borrowed: number;
  healthFactor: number;
}

const MARKET_METADATA: Record<string, { symbol: string }> = {
  xlm_shared: { symbol: 'XLM' },
  usdc_shared: { symbol: 'USDC' },
  eurc_shared: { symbol: 'EURC' },
  wbtc_satellite: { symbol: 'wBTC' },
  weth_satellite: { symbol: 'wETH' },
  ergo_satellite: { symbol: 'ERGO' },
};

export async function getUserPositions(userAddress: string): Promise<UserPosition[]> {
  const corePoolId = process.env.NEXT_PUBLIC_CORE_POOL_CONTRACT_ID || '';
  if (!corePoolId || !userAddress) {
    return [];
  }

  try {
    const userAddrVal = Address.fromString(userAddress).toScVal();
    const posSim = await simulateContractCall(corePoolId, 'get_user_position', [userAddrVal], userAddress);

    if ((posSim as any).result?.retval) {
      const nativePos = scValToNative((posSim as any).result.retval);
      const hf = Number(nativePos.health_factor || 0) / 10000;
      
      const marketsList = nativePos.markets || [];
      return marketsList.map((pos: any) => {
        const id = pos.market_id || 'usdc_shared';
        const meta = MARKET_METADATA[id.toLowerCase()] || { symbol: id.toUpperCase() };
        return {
          marketId: id,
          symbol: meta.symbol,
          supplied: Number(pos.supplied || 0) / 10_000_000,
          borrowed: Number(pos.borrowed || 0) / 10_000_000,
          healthFactor: hf,
        };
      });
    }
  } catch (e) {
    console.error('Error fetching on-chain user positions:', e);
  }
  return [];
}

export async function getWalletBalance(
  userAddress: string,
  assetContractId: string
): Promise<number> {
  if (!userAddress || !assetContractId) return 0;
  
  try {
    const userAddrVal = Address.fromString(userAddress).toScVal();
    const result = await simulateContractCall(
      assetContractId,
      'balance',
      [userAddrVal],
      userAddress
    );
    if ((result as any).result?.retval) {
      const balanceVal = scValToNative((result as any).result.retval);
      return Number(balanceVal) / 10_000_000; // Standard 7 decimal scaling
    }
  } catch (e) {
    console.error(`Error fetching balance for token ${assetContractId}:`, e);
  }
  return 0;
}

function getFallbackPositions(user: string): UserPosition[] {
  return [
    {
      marketId: "usdc_shared",
      symbol: "USDC",
      supplied: 1500,
      borrowed: 0,
      healthFactor: 999999,
    },
    {
      marketId: "xlm_shared",
      symbol: "XLM",
      supplied: 10000,
      borrowed: 1200,
      healthFactor: 1.84,
    }
  ];
}
