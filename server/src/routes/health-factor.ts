import { Router, Response } from 'express';
import { verifySep10Auth, AuthenticatedRequest } from '../middleware/sep10.js';
import { db } from '../db/index.js';

const router = Router();

router.get('/', verifySep10Auth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.userAddress!;
  try {
    const positions = await db.getPositions(user);
    if (positions.length === 0) {
      return res.json({ healthFactor: '999999', isLiquidatable: false, positions: [] });
    }
    const borrows = positions.some(p => p.borrowed > 0);
    const minHf = positions.reduce((acc, curr) => Math.min(acc, curr.health_factor), 999999);
    
    return res.json({
      healthFactor: minHf === 999999 ? 'Infinity' : minHf.toFixed(4),
      isLiquidatable: borrows && minHf < 1.0,
      positions
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;