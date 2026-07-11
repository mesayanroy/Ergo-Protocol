import { rpc, TransactionBuilder, Networks, Keypair, Asset, Operation } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const server = new rpc.Server('https://soroban-testnet.stellar.org');
const deployerSecret = 'SDUFSOYWDGZT2UXR2VJDPOPQ62TDU5MRDUQRZY2V7322ITVOFSG4DWGR';
const deployerKeypair = Keypair.fromSecret(deployerSecret);
const deployerAddress = deployerKeypair.publicKey();
const targetWallet = 'GARN7A6OJKPR3HAPVIKM6GRUD7KMEHYQ76VJJCO4AAKQ6ETEKFQPQ24T';

async function getAccount(address) {
  return await server.getAccount(address);
}

async function main() {
  console.log(`ERGO Token Issuer (Testnet): ${deployerAddress}`);
  console.log(`Sending 50,000 ERGO classic tokens to ${targetWallet}...`);
  
  const account = await getAccount(deployerAddress);
  const ergoAsset = new Asset('ERGO', deployerAddress);

  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: Networks.TESTNET
  })
  .addOperation(Operation.payment({
    destination: targetWallet,
    asset: ergoAsset,
    amount: '50000.0000000'
  }))
  .setTimeout(60)
  .build();

  tx.sign(deployerKeypair);
  const response = await server.sendTransaction(tx);
  if (response.status === 'ERROR') {
    throw new Error(`Submission failed: ${JSON.stringify(response)}`);
  }
  
  let status = response.status;
  let txResult = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    txResult = await server.getTransaction(response.hash);
    status = txResult.status;
    if (status === 'SUCCESS' || status === 'FAILED') break;
  }
  
  if (status !== 'SUCCESS') {
    console.error("FAILED TX DETAIL:", txResult.status);
    try {
      console.error("Result XDR base64:", txResult.resultXdr.toXDR('base64'));
    } catch (e) {
      console.error("Result XDR raw:", txResult.resultXdr);
    }
    throw new Error(`Transaction execution failed with status: ${txResult.status}`);
  }
  console.log('✓ 50,000 ERGO classic tokens sent to your Testnet wallet successfully!');
}

main().catch(console.error);
