import { useEffect, useState } from 'react';
import { Address, scValToNative } from '@stellar/stellar-sdk';
import { simulateContractCall } from '../rpc';

export function useWalletBalances(userAddress: string | null) {
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const [loading, setLoading] = useState(false);

  const ASSETS: Record<string, string> = {
    xlm: process.env.NEXT_PUBLIC_XLM_SAC || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    usdc: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || 'CB4A545ENTCQZUV33M2QT6RKLQ5K5ZRP34BR7NSJJLSS76NHH273QVA5',
    eurc: process.env.NEXT_PUBLIC_EURC_CONTRACT_ID || 'CBGN37EGC2VTOTROLR72BGCXEBZF2JGVHPPPN36IFKLVXBQLY3SXST6E',
    wbtc: process.env.NEXT_PUBLIC_WBTC_CONTRACT_ID || 'CDJHXKNMRY5UOX4JGAGEPBGR3DKYOBPXPDWXTLSRKPT2FN3SGPS762YE',
    weth: process.env.NEXT_PUBLIC_WETH_CONTRACT_ID || 'CAUJL5GHJGD3XZTATZZJK5PTKVXUBQEZ2LQFQB7DQTGUN62BFCOR7KXK',
    ergo: process.env.NEXT_PUBLIC_ERGO_TOKEN_CONTRACT_ID || 'CCR5A6TLOSX3JTEOHRSCKC3WWUOB4ZHOCEUXKI3NE6MU3XYDYSZVCX57',
  };

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
