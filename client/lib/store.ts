import { create } from 'zustand';
import { getAllMarkets, Market } from './markets';
import { getUserPositions, UserPosition } from './positions';
import { getLivePrice, OraclePrice } from './oracle';

interface ErgoStore {
  walletAddress: string | null;
  walletType: 'freighter' | 'albedo' | 'xbull' | null;
  
  markets: Market[];
  lastMarketsUpdate: number;
  
  userPositions: UserPosition[];
  healthFactor: number | null;
  borrowCapacity: number;
  netApy: number;

  prices: Record<string, OraclePrice>;

  refreshMarkets: () => Promise<void>;
  refreshPositions: (address: string) => Promise<void>;
  refreshPrices: () => Promise<void>;
  setWallet: (address: string, type: 'freighter' | 'albedo' | 'xbull') => void;
  clearWallet: () => void;
}

export const useErgoStore = create<ErgoStore>((set, get) => ({
  walletAddress: null,
  walletType: null,
  markets: [],
  lastMarketsUpdate: 0,
  userPositions: [],
  healthFactor: null,
  borrowCapacity: 0,
  netApy: 0,
  prices: {},

  refreshMarkets: async () => {
    try {
      const list = await getAllMarkets();
      set({ markets: list, lastMarketsUpdate: Date.now() });
    } catch (e) {
      console.error('Error in refreshMarkets:', e);
    }
  },

  refreshPositions: async (address: string) => {
    if (!address) return;
    try {
      const positions = await getUserPositions(address);
      const hf = positions.length > 0 ? positions[0].healthFactor : null;
      
      // Calculate capacity and APY metrics
      let totalSuppliedUSD = 0;
      let totalBorrowedUSD = 0;
      let weightedSupplyApy = 0;
      let weightedBorrowApy = 0;

      const markets = get().markets;
      positions.forEach(pos => {
        const market = markets.find(m => m.id === pos.marketId || m.symbol === pos.symbol);
        if (market) {
          const suppliedUSD = pos.supplied * market.price;
          const borrowedUSD = pos.borrowed * market.price;
          totalSuppliedUSD += suppliedUSD;
          totalBorrowedUSD += borrowedUSD;
          weightedSupplyApy += suppliedUSD * market.supplyRate;
          weightedBorrowApy += borrowedUSD * market.borrowRate;
        }
      });

      const borrowCapacity = totalSuppliedUSD * 0.80; // overall LTV estimate
      const netApy = totalSuppliedUSD > 0
        ? (weightedSupplyApy - weightedBorrowApy) / totalSuppliedUSD
        : 0;

      set({
        userPositions: positions,
        healthFactor: hf,
        borrowCapacity,
        netApy
      });
    } catch (e) {
      console.error('Error in refreshPositions:', e);
    }
  },

  refreshPrices: async () => {
    try {
      const assets = ['USDC', 'XLM', 'EURC', 'wBTC', 'wETH', 'ERGO'];
      const priceMap: Record<string, OraclePrice> = {};
      
      await Promise.all(assets.map(async asset => {
        const price = await getLivePrice(asset);
        priceMap[asset] = price;
      }));

      set({ prices: priceMap });
    } catch (e) {
      console.error('Error in refreshPrices:', e);
    }
  },

  setWallet: (address, type) => {
    set({ walletAddress: address, walletType: type });
    get().refreshPositions(address);
  },

  clearWallet: () => {
    set({
      walletAddress: null,
      walletType: null,
      userPositions: [],
      healthFactor: null,
      borrowCapacity: 0,
      netApy: 0
    });
  }
}));
