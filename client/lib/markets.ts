import { simulateContractCall } from './rpc';
import { scValToNative, xdr } from '@stellar/stellar-sdk';

export interface Market {
  id: string;
  symbol: string;
  name: string;
  logo: string;
  price: number;
  poolType: 'Shared Core' | 'Satellite' | 'Permissioned';
  active: boolean;
  permissioned: boolean;
  collateralFactor: number;
  liquidationThreshold: number;
  debtCeiling: string;
  emodeCategory: number;
  totalSupplied: number;
  totalBorrowed: number;
  borrowRate: number;
  supplyRate: number;
}

export interface MarketStats {
  id: string;
  symbol: string;
  price: number;
  totalSupplied: number;
  totalBorrowed: number;
  utilization: number;
  supplyApy: number;
  borrowApy: number;
}

const MARKET_METADATA: Record<string, { symbol: string; name: string; logo: string; priceFallback: number }> = {
  xlm: { symbol: 'XLM', name: 'Stellar Lumens', logo: '/logo_xlm.png', priceFallback: 0.12 },
  usdc: { symbol: 'USDC', name: 'USD Coin', logo: '/logo_usdc.png', priceFallback: 1.0 },
  eurc: { symbol: 'EURC', name: 'Euro Coin', logo: '/logo_eurc.png', priceFallback: 1.08 },
  wbtc: { symbol: 'wBTC', name: 'Wrapped Bitcoin', logo: '/logo_wbtc.png', priceFallback: 64200.0 },
  weth: { symbol: 'wETH', name: 'Wrapped Ether', logo: '/logo_weth.png', priceFallback: 3450.0 },
  ergo: { symbol: 'ERGO', name: 'Ergo Protocol Token', logo: '/logo_ergo.png', priceFallback: 0.50 },
  xlm_shared: { symbol: 'XLM', name: 'Stellar Lumens', logo: '/logo_xlm.png', priceFallback: 0.12 },
  usdc_shared: { symbol: 'USDC', name: 'USD Coin', logo: '/logo_usdc.png', priceFallback: 1.0 },
  eurc_shared: { symbol: 'EURC', name: 'Euro Coin', logo: '/logo_eurc.png', priceFallback: 1.08 },
  wbtc_satellite: { symbol: 'wBTC', name: 'Wrapped Bitcoin', logo: '/logo_wbtc.png', priceFallback: 64200.0 },
  weth_satellite: { symbol: 'wETH', name: 'Wrapped Ether', logo: '/logo_weth.png', priceFallback: 3450.0 },
  ergo_satellite: { symbol: 'ERGO', name: 'Ergo Protocol Token', logo: '/logo_ergo.png', priceFallback: 0.50 },
};

export async function getAllMarkets(): Promise<Market[]> {
  const corePoolId = process.env.NEXT_PUBLIC_CORE_POOL_CONTRACT_ID || '';
  if (!corePoolId) {
    return getFallbackMarkets();
  }

  try {
    const sim = await simulateContractCall(corePoolId, 'get_all_markets', []);
    if ((sim as any).result?.retval) {
      const native = scValToNative((sim as any).result.retval);
      const list = await Promise.all(native.map(async (m: any) => {
        const id = m.market_id || m.id;
        const meta = MARKET_METADATA[id.toLowerCase()] || { symbol: id.toUpperCase(), name: id, logo: '/logo_usdc.png', priceFallback: 1.0 };
        
        let price = meta.priceFallback;
        const oracleId = process.env.NEXT_PUBLIC_ORACLE_AGGREGATOR_CONTRACT_ID || '';
        if (oracleId) {
          try {
            const symVal = xdr.ScVal.scvSymbol(meta.symbol);
            const priceSim = await simulateContractCall(oracleId, 'get_price', [symVal]);
            if ((priceSim as any).result?.retval) {
              price = Number(scValToNative((priceSim as any).result.retval)) / 10000;
            }
          } catch (err) {
            console.warn(`Could not fetch live oracle price for ${meta.symbol}, using fallback`, err);
          }
        }

        return {
          id: id,
          symbol: meta.symbol,
          name: meta.name,
          logo: meta.logo,
          price: price,
          poolType: m.market_type === 'SharedCore' ? 'Shared Core' : 'Satellite',
          active: !m.paused,
          permissioned: m.permissioned,
          collateralFactor: Number(m.collateral_factor) / 10000,
          liquidationThreshold: Number(m.liability_factor) / 10000,
          debtCeiling: 'Unlimited',
          emodeCategory: 0,
          totalSupplied: Number(m.total_supplied) / 10000000,
          totalBorrowed: Number(m.total_borrowed) / 10000000,
          borrowRate: Number(m.borrow_apy) / 100000,
          supplyRate: Number(m.supply_apy) / 100000,
        };
      }));
      return list;
    }
  } catch (e) {
    console.error('Error fetching on-chain markets:', e);
  }
  return getFallbackMarkets();
}

export async function getMarketStats(marketId: string): Promise<MarketStats> {
  const markets = await getAllMarkets();
  const found = markets.find(m => m.id === marketId || m.symbol.toUpperCase() === marketId.toUpperCase());
  if (found) {
    const total = found.totalSupplied || 1;
    const borrowed = found.totalBorrowed || 0;
    return {
      id: found.id,
      symbol: found.symbol,
      price: found.price,
      totalSupplied: found.totalSupplied,
      totalBorrowed: found.totalBorrowed,
      utilization: (borrowed / total) * 100,
      supplyApy: found.supplyRate,
      borrowApy: found.borrowRate
    };
  }
  return {
    id: marketId,
    symbol: marketId.toUpperCase(),
    price: 1.0,
    totalSupplied: 1000000,
    totalBorrowed: 500000,
    utilization: 50.0,
    supplyApy: 3.5,
    borrowApy: 5.5
  };
}

function getFallbackMarkets(): Market[] {
  return [
    {
      id: "usdc_shared",
      symbol: "USDC",
      name: "USD Coin",
      logo: "/logo_usdc.png",
      price: 1.0,
      poolType: "Shared Core",
      active: true,
      permissioned: false,
      collateralFactor: 0.85,
      liquidationThreshold: 0.90,
      debtCeiling: "Unlimited",
      emodeCategory: 1,
      totalSupplied: 52400000,
      totalBorrowed: 31200000,
      borrowRate: 4.25,
      supplyRate: 2.85,
    },
    {
      id: "xlm_shared",
      symbol: "XLM",
      name: "Stellar Lumens",
      logo: "/logo_xlm.png",
      price: 0.12,
      poolType: "Shared Core",
      active: true,
      permissioned: false,
      collateralFactor: 0.75,
      liquidationThreshold: 0.80,
      debtCeiling: "Unlimited",
      emodeCategory: 1,
      totalSupplied: 12500000,
      totalBorrowed: 4200000,
      borrowRate: 6.80,
      supplyRate: 3.90,
    },
    {
      id: "eurc_shared",
      symbol: "EURC",
      name: "Euro Coin",
      logo: "/logo_eurc.png",
      price: 1.08,
      poolType: "Shared Core",
      active: true,
      permissioned: false,
      collateralFactor: 0.85,
      liquidationThreshold: 0.90,
      debtCeiling: "Unlimited",
      emodeCategory: 1,
      totalSupplied: 8500000,
      totalBorrowed: 3900000,
      borrowRate: 3.75,
      supplyRate: 2.10,
    },
    {
      id: "wbtc_satellite",
      symbol: "wBTC",
      name: "Wrapped Bitcoin",
      logo: "/logo_wbtc.png",
      price: 64200.0,
      poolType: "Satellite",
      active: true,
      permissioned: false,
      collateralFactor: 0.70,
      liquidationThreshold: 0.75,
      debtCeiling: "5,000,000",
      emodeCategory: 2,
      totalSupplied: 1800000,
      totalBorrowed: 1200000,
      borrowRate: 5.50,
      supplyRate: 3.20,
    },
    {
      id: "weth_satellite",
      symbol: "wETH",
      name: "Wrapped Ether",
      logo: "/logo_weth.png",
      price: 3450.0,
      poolType: "Satellite",
      active: true,
      permissioned: false,
      collateralFactor: 0.75,
      liquidationThreshold: 0.80,
      debtCeiling: "3,000,000",
      emodeCategory: 2,
      totalSupplied: 2400000,
      totalBorrowed: 1500000,
      borrowRate: 4.80,
      supplyRate: 2.90,
    },
    {
      id: "ergo_satellite",
      symbol: "ERGO",
      name: "Ergo Protocol Token",
      logo: "/logo_ergo.png",
      price: 0.50,
      poolType: "Satellite",
      active: true,
      permissioned: false,
      collateralFactor: 0.65,
      liquidationThreshold: 0.70,
      debtCeiling: "1,000,000",
      emodeCategory: 0,
      totalSupplied: 100000,
      totalBorrowed: 40000,
      borrowRate: 8.50,
      supplyRate: 4.10,
    }
  ];
}
