import { useEffect, useState } from 'react';
import { Address, scValToNative } from '@stellar/stellar-sdk';
import { simulateContractCall } from '../rpc';
import { config } from '../config';

export function useWalletBalances(userAddress: string | null) {
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const [loading, setLoading] = useState(false);

  const ASSETS: Record<string, string> = {};
  if ((config.assets as any).XLM) ASSETS.xlm = (config.assets as any).XLM;
  if ((config.assets as any).USDC) ASSETS.usdc = (config.assets as any).USDC;
  if ((config.assets as any).EURC) ASSETS.eurc = (config.assets as any).EURC;
  if ((config.assets as any).ERGO) ASSETS.ergo = (config.assets as any).ERGO;
  if ((config.assets as any).wBTC) ASSETS.wbtc = (config.assets as any).wBTC;
  if ((config.assets as any).wETH) ASSETS.weth = (config.assets as any).wETH;

  const fetchBalances = async () => {
    if (!userAddress) {
      setBalances({});
      return;
    }
    setLoading(true);
    try {
      const userAddrVal = Address.fromString(userAddress).toScVal();
      const results = await Promise.all(
        Object.entries(ASSETS).map(async ([symbol, contractId]) => {
          if (!contractId) return [symbol, 0n];
          try {
            const sim = await simulateContractCall(contractId, 'balance', [userAddrVal], userAddress);
            if ((sim as any).result?.retval) {
              const val = scValToNative((sim as any).result.retval);
              return [symbol, BigInt(val.toString())];
            }
          } catch (e) {
            console.warn(`Failed to fetch balance for asset ${symbol}:`, e);
          }
          return [symbol, 0n];
        })
      );
      setBalances(Object.fromEntries(results));
    } catch (e) {
      console.error('Failed to fetch wallet balances:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [userAddress]);

  return { balances, loading, refetch: fetchBalances };
}
