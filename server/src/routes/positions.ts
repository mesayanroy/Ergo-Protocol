import { Router, Response } from 'express';
import { verifySep10Auth, AuthenticatedRequest } from '../middleware/sep10.js';
import { db } from '../db/index.js';

const router = Router();

router.get('/', verifySep10Auth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.userAddress!;
  try {
    let positions = await db.getPositions(user);
    if (positions.length === 0) {
      positions = [
        {
          user_address: user,
          market_symbol: "USDC",
          supplied: 1500,
          borrowed: 0,
          delegated: 500,
          health_factor: 999999,
        },
        {
          user_address: user,
          market_symbol: "XLM",
          supplied: 10000,
          borrowed: 1200,
          delegated: 0,
          health_factor: 1.84,
        },
      ];
      for (const pos of positions) {
        await db.upsertPosition(pos);
      }
    }
    return res.json(positions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/update', verifySep10Auth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.userAddress!;
  const { market_symbol, supplied, borrowed, delegated, health_factor } = req.body;
  try {
    const pos = {
      user_address: user,
      market_symbol,
      supplied: Number(supplied || 0),
      borrowed: Number(borrowed || 0),
      delegated: Number(delegated || 0),
      health_factor: Number(health_factor || 999999),
    };
    await db.upsertPosition(pos);
    return res.json({ success: true, position: pos });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;