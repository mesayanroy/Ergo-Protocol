import React, { useState, useEffect } from 'react';
import { nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { simulateContractCall } from '../lib/rpc';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';

interface IRMChartProps {
  marketId: string;
}

interface IRMChartData {
  utilization: number;
  currentApr: number;
  baseApr: number;
}

export function IRMChart({ marketId }: IRMChartProps) {
  const [irmData, setIrmData] = useState<IRMChartData[]>([]);
  const [currentUtil, setCurrentUtil] = useState(0);

  useEffect(() => {
    const fetchIrm = async () => {
      try {
        const corePoolId = process.env.NEXT_PUBLIC_CORE_POOL_CONTRACT_ID || 'CCTXZNKEDNDA3ZGL6TQV2TSGNJ6HLUQCWXGIA6NOFKT53VESNDIYJRQH';
        const marketVal = nativeToScVal(marketId, { type: 'symbol' });

        const [paramsSim, utilSim] = await Promise.all([
          simulateContractCall(corePoolId, 'get_irm_params', [marketVal]),
          simulateContractCall(corePoolId, 'get_current_utilization', [marketVal]),
        ]);

        if ((paramsSim as any).result?.retval && (utilSim as any).result?.retval) {
          const params = scValToNative((paramsSim as any).result.retval);
          const util = scValToNative((utilSim as any).result.retval);

          const baseRate = Number(params.base_rate);
          const slope = Number(params.slope);
          const utilPct = Number(util) / 100000; // e.g. 50_000 -> 50%

          // Build curve: 0% to 100% utilization
          const data = Array.from({ length: 101 }, (_, i) => ({
            utilization: i,
            currentApr: (baseRate + (i / 100) * slope) / 100000,
            baseApr: baseRate / 100000,
          }));

          setIrmData(data);
          setCurrentUtil(utilPct);
        }
      } catch (e) {
        console.error('Failed to load IRM parameters:', e);
      }
    };

    fetchIrm();
  }, [marketId]);

  return (
    <div className="w-full h-56 mt-4 p-4 rounded-2xl bg-white/5 border border-white/5">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Interest Rate Model Curve</span>
        <span className="text-xs text-brandLime font-mono">Current Utilization: {currentUtil.toFixed(1)}%</span>
      </div>
      <div className="w-full h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={irmData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="aprGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4FF3F" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#D4FF3F" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="utilization" stroke="rgba(255,255,255,0.2)" fontSize={10} unit="%" />
            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} unit="%" />
            <Tooltip
              contentStyle={{ background: '#121316', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
              labelClassName="text-white text-xs font-bold font-mono"
            />
            <Area type="monotone" dataKey="currentApr" stroke="#D4FF3F" fillOpacity={1} fill="url(#aprGlow)" strokeWidth={2} name="Borrow APR" />
            <Area type="monotone" dataKey="baseApr" stroke="#7C3AED" fillOpacity={0} strokeWidth={1} name="Base APR" />
            <ReferenceLine x={currentUtil} stroke="#ffffff55" strokeDasharray="3 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
