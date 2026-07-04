import { useEffect, useState } from 'react';
import { scValToNative } from '@stellar/stellar-sdk';
import { simulateContractCall } from '../rpc';

export interface MarketStats {
  marketId: string;
  totalSupplied: bigint;
  totalBorrowed: bigint;
  availableLiquidity: bigint;
  utilizationRate: bigint;
  supplyApy: bigint;
  borrowApy: bigint;
  collateralFactor: number;
  liabilityFactor: number;
  paused: boolean;
  permissioned: boolean;
  marketType: string;
}

export function useMarkets() {
  const [markets, setMarkets] = useState<MarketStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkets = async () => {
    try {
      const corePoolId = process.env.NEXT_PUBLIC_CORE_POOL_CONTRACT_ID || 'CCTXZNKEDNDA3ZGL6TQV2TSGNJ6HLUQCWXGIA6NOFKT53VESNDIYJRQH';
      const sim = await simulateContractCall(corePoolId, 'get_all_markets', []);
      if ((sim as any).result?.retval) {
        const native = scValToNative((sim as any).result.retval);
        const parsed: MarketStats[] = native.map((m: any) => ({
          marketId: m.market_id,
          totalSupplied: m.total_supplied,
          totalBorrowed: m.total_borrowed,
          availableLiquidity: m.available_liquidity,
          utilizationRate: m.utilization_rate,
          supplyApy: m.supply_apy,
          borrowApy: m.borrow_apy,
          collateralFactor: m.collateral_factor,
          liabilityFactor: m.liability_factor,
          paused: m.paused,
          permissioned: m.permissioned,
          marketType: m.market_type,
        }));
        setMarkets(parsed);
      }
    } catch (e) {
      console.error('Failed to fetch markets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  return { markets, loading, refetch: fetchMarkets };
}
