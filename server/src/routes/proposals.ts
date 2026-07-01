import { Router, Response } from 'express';
import { verifySep10Auth, AuthenticatedRequest } from '../middleware/sep10.js';
import { db } from '../db/index.js';

const router = Router();

router.get('/', async (req, res: Response) => {
  try {
    const proposals = await db.getAllProposals();
    return res.json(proposals);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', verifySep10Auth, async (req: AuthenticatedRequest, res: Response) => {
  const proposer = req.userAddress!;
  const { target_contract, action_name } = req.body;
  try {
    const id = Date.now();
    const end_time = Math.floor(Date.now() / 1000) + 86400; // 1 day
    const prop = {
      id,
      proposer,
      target_contract,
      action_name,
      votes_for: 0,
      votes_against: 0,
      end_time,
      executed: false,
    };
    await db.upsertProposal(prop);
    return res.json({ success: true, proposal: prop });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/vote', verifySep10Auth, async (req: AuthenticatedRequest, res: Response) => {
  const { id, support } = req.body;
  try {
    const prop = await db.getProposal(Number(id));
    if (!prop) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    const weight = 100;
    if (support) {
      prop.votes_for += weight;
    } else {
      prop.votes_against += weight;
    }
    await db.upsertProposal(prop);
    return res.json({ success: true, proposal: prop });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;