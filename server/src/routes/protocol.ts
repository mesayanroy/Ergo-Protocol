import { Router, Response } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/stats', async (req, res: Response) => {
  try {
    const marketsRes = await db.query("SELECT SUM(total_supplied) as total_supplied, SUM(total_borrowed) as total_borrowed FROM markets");
    const usersRes = await db.query("SELECT COUNT(DISTINCT user_address) as total_users FROM positions");
    
    const totalSupplied = Number(marketsRes.rows[0]?.total_supplied || 73400000);
    const totalBorrowed = Number(marketsRes.rows[0]?.total_borrowed || 39300000);
    const totalUsers = Number(usersRes.rows[0]?.total_users || 1240);

    return res.json({
      tvl: totalSupplied - totalBorrowed,
      totalSupplied,
      totalBorrowed,
      totalUsers
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
