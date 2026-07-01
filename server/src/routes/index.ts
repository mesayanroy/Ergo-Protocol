import { Router } from 'express';
import healthFactorRouter from './health-factor.js';
import marketsRouter from './markets.js';
import positionsRouter from './positions.js';
import proposalsRouter from './proposals.js';

const router = Router();

router.use('/health-factor', healthFactorRouter);
router.use('/markets', marketsRouter);
router.use('/positions', positionsRouter);
router.use('/proposals', proposalsRouter);

export default router;