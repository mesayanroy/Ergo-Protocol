import { Router, Response } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/', async (req, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const offset = (page - 1) * limit;

  try {
    const proposals = await db.getAllProposals();
    const paginated = proposals.slice(offset, offset + limit);
    return res.json({
      page,
      limit,
      total: proposals.length,
      proposals: paginated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:proposalId', async (req, res: Response) => {
  const proposalId = Number(req.params.proposalId);
  try {
    const proposal = await db.getProposal(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    return res.json({
      ...proposal,
      votesBreakdown: {
        for: proposal.votes_for,
        against: proposal.votes_against,
        totalCast: proposal.votes_for + proposal.votes_against,
        quorumPercentage: ((proposal.votes_for + proposal.votes_against) / 10_000) * 100
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;