import { Router, Response } from 'express';
import { Keypair, Networks } from '@stellar/stellar-sdk';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

let serverKeypair: Keypair;
try {
  serverKeypair = Keypair.fromSecret(process.env.SEP10_SIGNING_KEY || '');
} catch (e) {
  serverKeypair = Keypair.random();
}
const jwtSecret = process.env.JWT_SECRET || 'ergo_super_secret_jwt_key';

router.post('/challenge', async (req, res: Response) => {
  const { address } = req.body;
  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const challengeMessage = `SEP10-Challenge:${address}:${nonce}:${process.env.SEP10_WEB_AUTH_DOMAIN || 'ergo-protocol.vercel.app'}`;
    const signature = serverKeypair.sign(Buffer.from(challengeMessage)).toString('base64');

    return res.json({
      challenge: challengeMessage,
      network: Networks.TESTNET,
      signature
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/verify', async (req, res: Response) => {
  const { challenge, signature, address } = req.body;
  if (!challenge || !signature || !address) {
    return res.status(400).json({ error: 'Missing challenge, signature, or address' });
  }

  try {
    const userKeypair = Keypair.fromPublicKey(address);
    const verified = userKeypair.verify(Buffer.from(challenge), Buffer.from(signature, 'base64'));

    if (!verified) {
      return res.status(401).json({ error: 'Invalid signature verification failed' });
    }

    const token = jwt.sign(
      { sub: address, role: 'user' },
      jwtSecret,
      { expiresIn: (process.env.JWT_EXPIRY as any) || '24h' }
    );

    return res.json({
      token,
      address,
      expiresIn: process.env.JWT_EXPIRY || '24h'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
