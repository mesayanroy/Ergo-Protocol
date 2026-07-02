import { Router, Response } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/', async (req, res: Response) => {
  try {
    const auctions = await db.getAllAuctions();
    return res.json(auctions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:auctionId', async (req, res: Response) => {
  const auctionId = Number(req.params.auctionId);
  try {
    const auctions = await db.getAllAuctions();
    const auction = auctions.find(a => a.id === auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }
    return res.json(auction);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
