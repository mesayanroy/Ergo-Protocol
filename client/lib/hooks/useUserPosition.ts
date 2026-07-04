import { useEffect, useState } from 'react';
import { Address, scValToNative } from '@stellar/stellar-sdk';
import { simulateContractCall } from '../rpc';

export interface UserMarketPosition {
  marketId: string;
  supplied: bigint;
  borrowed: bigint;
}

export interface UserPosition {
  healthFactor: number;
  borrowCapacityUsd: number;
  netApy: number;
  positionsUsed: number;
  markets: UserMarketPosition[];
}

export function useUserPosition(userAddress: string | null) {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPosition = async () => {
    if (!userAddress) {
      setPosition(null);
      return;
    }
    setLoading(true);
    try {
      const corePoolId = process.env.NEXT_PUBLIC_CORE_POOL_CONTRACT_ID || 'CCTXZNKEDNDA3ZGL6TQV2TSGNJ6HLUQCWXGIA6NOFKT53VESNDIYJRQH';
      const userAddrVal = Address.fromString(userAddress).toScVal();
      const sim = await simulateContractCall(corePoolId, 'get_user_position', [userAddrVal], userAddress);
      
      if ((sim as any).result?.retval) {
        const native = scValToNative((sim as any).result.retval);
        setPosition({
          healthFactor: Number(native.health_factor) / 10000,
          borrowCapacityUsd: Number(native.borrow_capacity_usd) / 10000000,
          netApy: Number(native.net_apy) / 100000,
          positionsUsed: Number(native.positions_used),
          markets: native.markets.map((m: any) => ({
            marketId: m.market_id,
            supplied: m.supplied,
            borrowed: m.borrowed,
          })),
        });
      }
    } catch (e) {
      console.error('Failed to fetch user position:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosition();
    if (!userAddress) return;
    const interval = setInterval(fetchPosition, 10000);
    return () => clearInterval(interval);
  }, [userAddress]);

  return { position, loading, refetch: fetchPosition };
}
