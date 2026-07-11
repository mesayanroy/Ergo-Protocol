import { Router, Response } from 'express';
import { getAggregatedPrice } from '../services/oracle.js';
import { db } from '../db/index.js';

const router = Router();

router.get('/:asset', async (req, res: Response) => {
  const asset = req.params.asset.toUpperCase();
  try {
    const agg = await getAggregatedPrice(asset);
    
    const snapshots = await db.query(
      "SELECT * FROM price_snapshots WHERE asset_code = $1 ORDER BY recorded_at DESC LIMIT 10",
      [asset]
    );

    return res.json({
      asset,
      price: agg.median,
      reflectorPrice: agg.reflectorPrice,
      twapPrice: agg.twapPrice,
      medianPrice: agg.median,
      deviationBps: agg.deviationBps,
      circuitBreakerTripped: agg.circuitBreakerTripped,
      history: snapshots.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
