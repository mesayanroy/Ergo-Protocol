import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { getLivePosition, getLiveHealthFactor } from '../services/stellar.js';

const router = Router();

router.get('/:address', async (req, res: Response) => {
  const address = req.params.address;
  try {
    let positions = await db.getPositions(address);
    
    const xlmLive = await getLivePosition(address, 'XLM');
    const usdcLive = await getLivePosition(address, 'USDC');
    const liveHf = await getLiveHealthFactor(address);

    if (xlmLive || usdcLive) {
      positions = [
        {
          user_address: address,
          market_symbol: 'XLM',
          supplied: Number(xlmLive?.supplied || 0),
          borrowed: Number(xlmLive?.borrowed || 0),
          delegated: Number(xlmLive?.delegated || 0),
          health_factor: liveHf,
        },
        {
          user_address: address,
          market_symbol: 'USDC',
          supplied: Number(usdcLive?.supplied || 0),
          borrowed: Number(usdcLive?.borrowed || 0),
          delegated: Number(usdcLive?.delegated || 0),
          health_factor: liveHf,
        }
      ];
    }

    if (positions.length === 0) {
      positions = [
        {
          user_address: address,
          market_symbol: "USDC",
          supplied: 1500,
          borrowed: 0,
          delegated: 500,
          health_factor: 999999,
        },
        {
          user_address: address,
          market_symbol: "XLM",
          supplied: 10000,
          borrowed: 1200,
          delegated: 0,
          health_factor: 1.84,
        },
      ];
    }
    
    return res.json(positions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:address/history', async (req, res: Response) => {
  const address = req.params.address;
  try {
    const txs = await db.query(
      "SELECT * FROM transactions WHERE user_address = $1 ORDER BY created_at DESC",
      [address]
    );
    return res.json(txs.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;