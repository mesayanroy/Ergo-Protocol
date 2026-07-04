import { Router, Request, Response } from 'express';
import { Horizon, Networks, TransactionBuilder, Operation, Asset, Keypair } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const horizonUrl = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;
const adminSecret = process.env.ADMIN_SECRET_KEY;
if (!adminSecret) {
  throw new Error('ADMIN_SECRET_KEY not set in .env');
}
const adminKeypair = Keypair.fromSecret(adminSecret);
const server = new Horizon.Server(horizonUrl);

router.post('/', async (req: Request, res: Response) => {
  const { address, assetCode, contractId, amount } = req.body;
  if (!address || !assetCode || !contractId || !amount) {
    return res.status(400).json({ error: 'Missing required fields: address, assetCode, contractId, amount' });
  }

  try {
    // Load admin account
    const adminAccount = await server.loadAccount(adminKeypair.publicKey());
    const asset = new Asset(assetCode, contractId);
    const tx = new TransactionBuilder(adminAccount, {
      fee: '100',
      networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: address,
          asset,
          amount: amount.toString(),
        })
      )
      .setTimeout(30)
      .build();
    tx.sign(adminKeypair);
    const result = await server.submitTransaction(tx);
    return res.json({ success: true, hash: result.hash, ledger: result.ledger });
  } catch (e: any) {
    console.error('Faucet error', e);
    return res.status(500).json({ error: e.message || 'Faucet transaction failed' });
  }
});

export default router;
