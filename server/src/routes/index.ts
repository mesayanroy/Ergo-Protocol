import { Router } from 'express';
import healthFactorRouter from './health-factor.js';
import marketsRouter from './markets.js';
import positionsRouter from './positions.js';
import proposalsRouter from './proposals.js';
import oracleRouter from './oracle.js';
import auctionsRouter from './auctions.js';
import backstopRouter from './backstop.js';
import protocolRouter from './protocol.js';
import authRouter from './auth.js';
import complianceRouter from './compliance.js';
import faucetRouter from './faucet.js';
import adminRouter from './admin.js';

const router = Router();

router.use('/health-factor', healthFactorRouter);
router.use('/markets', marketsRouter);
router.use('/positions', positionsRouter);
router.use('/proposals', proposalsRouter);
router.use('/oracle', oracleRouter);
router.use('/auctions', auctionsRouter);
router.use('/backstop', backstopRouter);
router.use('/protocol', protocolRouter);
router.use('/auth', authRouter);
router.use('/compliance', complianceRouter);
router.use('/faucet', faucetRouter);
router.use('/admin', adminRouter);

export default router;