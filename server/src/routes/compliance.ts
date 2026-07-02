import { Router, Response } from 'express';
import { Keypair } from '@stellar/stellar-sdk';
import { db } from '../db/index.js';

const router = Router();

router.post('/authorize', async (req, res: Response) => {
  const { marketId, userAddress, issuerAddress, signature, message } = req.body;
  if (!marketId || !userAddress || !issuerAddress || !signature || !message) {
    return res.status(400).json({ error: 'Missing marketId, userAddress, issuerAddress, signature, or message' });
  }

  try {
    const issuerKeypair = Keypair.fromPublicKey(issuerAddress);
    const verified = issuerKeypair.verify(Buffer.from(message), Buffer.from(signature, 'base64'));

    if (!verified) {
      return res.status(401).json({ error: 'Invalid issuer signature' });
    }

    await db.query(
      `INSERT INTO compliance_allowlist (market_id, user_address, kyc_verified, authorized_by, authorized_at) 
       VALUES ($1, $2, true, $3, NOW()) 
       ON CONFLICT (market_id, user_address) DO UPDATE SET kyc_verified = true, authorized_at = NOW()`,
      [marketId, userAddress, issuerAddress]
    );

    return res.json({
      status: 'success',
      marketId,
      userAddress,
      kycVerified: true,
      authorizedBy: issuerAddress
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
