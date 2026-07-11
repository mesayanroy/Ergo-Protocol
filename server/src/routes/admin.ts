import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';

const router = Router();

// POST /api/admin/verify
router.post('/verify', (req: Request, res: Response) => {
  const { password, secretPhrase } = req.body;
  
  if (password === 'sr67!@#$' && secretPhrase === 'i , me , myself') {
    return res.json({ success: true, token: 'session_authenticated_ergo_admin' });
  }
  
  return res.status(401).json({ error: 'Invalid password or secret phrase' });
});

// GET /api/admin/metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const stats = await db.getStats();
    const daily = await db.getDailyMetrics();
    
    return res.json({
      stats,
      daily
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/indexer
router.get('/indexer', async (req: Request, res: Response) => {
  try {
    const checkpoint = await db.getCheckpoint('ergo_indexer') || 0;
    
    // Fetch last 15 processed events
    const eventsRes = await db.query(
      "SELECT * FROM events ORDER BY id DESC LIMIT 15"
    );
    
    return res.json({
      indexerName: 'ergo_indexer',
      status: 'active',
      lastProcessedLedger: checkpoint,
      recentEvents: eventsRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/markets
router.get('/markets', async (req: Request, res: Response) => {
  try {
    const markets = await db.getMarkets();
    return res.json({ markets });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
