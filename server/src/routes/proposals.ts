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

router.post('/', async (req, res: Response) => {
  const { title, description, proposer, targetContract, actionName, endTime } = req.body;
  if (!title || !proposer) {
    return res.status(400).json({ error: 'Missing title or proposer' });
  }
  try {
    const proposals = await db.getAllProposals();
    const nextId = proposals.length > 0 ? Math.max(...proposals.map(p => p.id)) + 1 : 1;
    const newProp = {
      id: nextId,
      title,
      description: description || '',
      proposer,
      target_contract: targetContract || '',
      action_name: actionName || 'UPGRADE',
      votes_for: 0,
      votes_against: 0,
      status: 'Active',
      end_time: endTime || (Math.floor(Date.now() / 1000) + 86400 * 5),
      executed: false
    };
    await db.upsertProposal(newProp);
    return res.status(201).json(newProp);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:proposalId/vote', async (req, res: Response) => {
  const proposalId = Number(req.params.proposalId);
  const { supports, votes } = req.body;
  try {
    const proposal = await db.getProposal(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    const voteAmount = Number(votes || 2500);
    if (supports) {
      proposal.votes_for += voteAmount;
    } else {
      proposal.votes_against += voteAmount;
    }
    await db.upsertProposal(proposal);
    return res.json(proposal);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;