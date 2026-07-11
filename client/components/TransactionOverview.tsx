import React, { useState, useEffect } from 'react';
import { Address, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { simulateContractCall } from '../lib/rpc';
import { config } from '../lib/config';

export interface SimulationResult {
  hfBefore: number;
  hfAfter: number;
  borrowCapacityBefore: number;
  borrowCapacityAfter: number;
  borrowLimitPctBefore: number;
  borrowLimitPctAfter: number;
  positionBefore: number;
  positionAfter: number;
  gasEstimate: number;
}

export interface TransactionOverviewProps {
  action: 'supply' | 'borrow' | 'withdraw' | 'repay';
  marketId: string;
  amount: bigint;
  userAddress: string | null;
  symbol: string;
}

export function TransactionOverview({
  action,
  marketId,
  amount,
  userAddress,
  symbol
}: TransactionOverviewProps) {
  const [preview, setPreview] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!amount || amount <= 0n || !userAddress) {
      setPreview(null);
      return;
    }

    const runSim = async () => {
      setLoading(true);
      try {
        const corePoolId = config.contracts.corePool;
        const method = `simulate_${action}`;
        const userAddrVal = Address.fromString(userAddress).toScVal();
        const marketVal = nativeToScVal(marketId, { type: 'symbol' });
        const amountVal = nativeToScVal(amount, { type: 'i128' });

        const sim = await simulateContractCall(corePoolId, method, [userAddrVal, marketVal, amountVal], userAddress);
        if ((sim as any).result?.retval) {
          const native = scValToNative((sim as any).result.retval);
          setPreview({
            hfBefore: Number(native.hf_before) / 10000,
            hfAfter: Number(native.hf_after) / 10000,
            borrowCapacityBefore: Number(native.borrow_capacity_before) / 10000000,
            borrowCapacityAfter: Number(native.borrow_capacity_after) / 10000000,
            borrowLimitPctBefore: Number(native.borrow_limit_pct_before),
            borrowLimitPctAfter: Number(native.borrow_limit_pct_after),
            positionBefore: Number(native.position_before) / 10000000,
            positionAfter: Number(native.position_after) / 10000000,
            gasEstimate: Number(native.gas_estimate) / 10000000, // converted to XLM
          });
        }
      } catch (e) {
        console.error('Failed to simulate transaction:', e);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(runSim, 400);
    return () => clearTimeout(debounce);
  }, [amount, marketId, action, userAddress]);

  if (loading) {
    return (
      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs font-mono text-center text-brandGray">
        Simulating transaction impact...
      </div>
    );
  }

  if (!preview) return null;

  const getHealthFactorLabel = (val: number) => {
    if (val > 50) return 'Infinite';
    return val.toFixed(2);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs flex flex-col gap-2 font-mono">
      <span className="text-[10px] uppercase font-bold text-brandGray font-sans">Transaction Overview</span>
      
      <div className="flex justify-between">
        <span className="text-brandGray">Gas Estimate:</span>
        <span className="text-white">{preview.gasEstimate.toFixed(4)} XLM</span>
      </div>

      <div className="flex justify-between">
        <span className="text-brandGray">
          {action === 'supply' || action === 'withdraw' ? 'Your total supplied:' : 'Your total borrowed:'}
        </span>
        <span className="text-white">
          {preview.positionBefore.toFixed(2)} → {preview.positionAfter.toFixed(2)} {symbol}
        </span>
      </div>

      <div className="flex justify-between">
        <span className="text-brandGray">Borrow Capacity:</span>
        <span className="text-white">
          ${preview.borrowCapacityBefore.toFixed(2)} → ${preview.borrowCapacityAfter.toFixed(2)}
        </span>
      </div>

      <div className="flex justify-between">
        <span className="text-brandGray">Borrow Limit:</span>
        <span className="text-white">
          {preview.borrowLimitPctBefore.toFixed(1)}% → {preview.borrowLimitPctAfter.toFixed(1)}%
        </span>
      </div>

      {(action === 'borrow' || action === 'withdraw') && (
        <div className="flex justify-between">
          <span className="text-brandGray">Health Factor:</span>
          <span className={preview.hfAfter < 1.2 ? 'text-red-400 font-bold' : 'text-brandLime font-bold'}>
            {getHealthFactorLabel(preview.hfBefore)} → {getHealthFactorLabel(preview.hfAfter)}
          </span>
        </div>
      )}
    </div>
  );
}
