import { Router, Response } from 'express';
import { getLivePrice } from '../services/stellar.js';
import { db } from '../db/index.js';

const router = Router();

router.get('/:asset', async (req, res: Response) => {
  const asset = req.params.asset.toUpperCase();
  try {
    const livePrice = await getLivePrice(asset);
    
    const snapshots = await db.query(
      "SELECT * FROM price_snapshots WHERE asset_code = $1 ORDER BY recorded_at DESC LIMIT 10",
      [asset]
    );

    return res.json({
      asset,
      price: livePrice || 1.0,
      reflectorPrice: livePrice || 1.0,
      twapPrice: livePrice || 1.0,
      medianPrice: livePrice || 1.0,
      deviationBps: 0,
      circuitBreakerTripped: false,
      history: snapshots.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
