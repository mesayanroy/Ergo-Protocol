import { Router, Response } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/', async (req, res: Response) => {
  try {
    const usdcPrice = await db.getPrice("USDC");
    const xlmPrice = await db.getPrice("XLM");
    const eurcPrice = await db.getPrice("EURC");

    const markets = [
      {
        id: "usdc",
        symbol: "USDC",
        name: "USD Coin",
        logo: "/logo_usdc.png",
        price: usdcPrice || 1.0,
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
        price: xlmPrice || 0.12,
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
        price: eurcPrice || 1.08,
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
    return res.json(markets);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;