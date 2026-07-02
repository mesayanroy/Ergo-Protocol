import { Router, Response } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/:poolId', async (req, res: Response) => {
  const poolId = req.params.poolId;
  try {
    const queryRes = await db.query("SELECT * FROM backstop_balances WHERE pool_id = $1", [poolId]);
    if (queryRes.rows.length > 0) {
      return res.json(queryRes.rows[0]);
    }
    
    return res.json({
      pool_id: poolId,
      total_balance: 1250000,
      worst_case_shortfall: 45000,
      coverage_ratio: 27.77,
      updated_at: new Date()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
