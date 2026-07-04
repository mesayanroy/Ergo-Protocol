import { simulateContractCall } from './rpc';
import { scValToNative, xdr } from '@stellar/stellar-sdk';

export interface OraclePrice {
  median: number;
  reflectorPrice: number;
  twapPrice: number;
  deviation: number;
  circuitBreakerTripped: boolean;
}

export async function getLivePrice(asset: string): Promise<OraclePrice> {
  const oracleId = process.env.NEXT_PUBLIC_ORACLE_AGGREGATOR_CONTRACT_ID || '';
  if (!oracleId) {
    return getFallbackPrice(asset);
  }

  try {
    const symVal = xdr.ScVal.scvSymbol(asset);
    
    // Call aggregator get_price + is_tripped
    const [priceSim, trippedSim] = await Promise.all([
      simulateContractCall(oracleId, 'get_price', [symVal]),
      simulateContractCall(oracleId, 'is_tripped', [symVal]),
    ]);

    let price = 0;
    let tripped = false;

    if ((priceSim as any).result?.retval) {
      price = Number(scValToNative((priceSim as any).result.retval)) / 10_000;
    }
    if ((trippedSim as any).result?.retval) {
      tripped = scValToNative((trippedSim as any).result.retval);
    }

    return {
      median: price || 1.00,
      reflectorPrice: price || 1.00,
      twapPrice: price || 1.00,
      deviation: 0,
      circuitBreakerTripped: tripped
    };

  } catch (e) {
    console.error(`Error querying live price for ${asset}:`, e);
  }
  return getFallbackPrice(asset);
}

function getFallbackPrice(asset: string): OraclePrice {
  const prices: Record<string, number> = {
    USDC: 1.0,
    XLM: 0.12,
    EURC: 1.08,
    wBTC: 64200.0,
    wETH: 3450.0,
    ERGO: 0.50
  };
  const price = prices[asset.toUpperCase()] || 1.00;
  return {
    median: price,
    reflectorPrice: price,
    twapPrice: price,
    deviation: 0.02, // 0.02%
    circuitBreakerTripped: false
  };
}
