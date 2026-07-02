import { Router, Response } from 'express';
import { getLivePrice } from '../services/stellar.js';

const router = Router();

const getMarketsList = async () => {
  const usdcPrice = await getLivePrice("USDC") || 1.0;
  const xlmPrice = await getLivePrice("XLM") || 0.12;
  const eurcPrice = await getLivePrice("EURC") || 1.08;

  return [
    {
      id: "usdc",
      symbol: "USDC",
      name: "USD Coin",
      logo: "/logo_usdc.png",
      price: usdcPrice,
      poolType: "Shared Core",
      active: true,
      permissioned: false,
      collateralFactor: 0.75,
      liquidationThreshold: 0.80,
      debtCeiling: "Unlimited",
      emodeCategory: 1,
      totalSupplied: 52400000,
      totalBorrowed: 31200000,
      borrowRate: 4.25,
      supplyRate: 2.85,
    },
    {
      id: "xlm",
      symbol: "XLM",
      name: "Stellar Lumens",
      logo: "/logo_xlm.png",
      price: xlmPrice,
      poolType: "Satellite",
      active: true,
      permissioned: false,
      collateralFactor: 0.60,
      liquidationThreshold: 0.70,
      debtCeiling: "5,000,000",
      emodeCategory: 0,
      totalSupplied: 12500000,
      totalBorrowed: 4200000,
      borrowRate: 6.80,
      supplyRate: 3.90,
    },
    {
      id: "eurc",
      symbol: "EURC",
      name: "Euro Coin",
      logo: "/logo_eurc.png",
      price: eurcPrice,
      poolType: "Permissioned",
      active: true,
      permissioned: true,
      collateralFactor: 0.70,
      liquidationThreshold: 0.78,
      debtCeiling: "1,000,000",
      emodeCategory: 1,
      totalSupplied: 8500000,
      totalBorrowed: 3900000,
      borrowRate: 3.75,
      supplyRate: 2.10,
    },
  ];
};

router.get('/', async (req, res: Response) => {
  try {
    const list = await getMarketsList();
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:marketId', async (req, res: Response) => {
  const marketId = req.params.marketId.toLowerCase();
  try {
    const list = await getMarketsList();
    const market = list.find(m => m.id === marketId || m.symbol.toLowerCase() === marketId);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const livePrice = await getLivePrice(market.symbol);

    return res.json({
      ...market,
      oracleConnection: {
        status: livePrice > 0 ? "connected" : "degraded",
        lastChecked: new Date(),
        feedCount: 2,
        primaryFeed: process.env.REFLECTOR_CONTRACT_ID || "CBKF3DIVWXW37KIWM74WFZRYFMWBLJZFMB6GUP3MVGUSUPKJTJVLNPJ"
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;