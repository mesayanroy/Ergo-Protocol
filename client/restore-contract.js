import { Contract, rpc, TransactionBuilder, Account, Networks, Operation, Keypair } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const server = new rpc.Server('https://soroban-testnet.stellar.org');
const adminSecret = process.env.ADMIN_SECRET_KEY || 'SDUFSOYWDGZT2UXR2VJDPOPQ62TDU5MRDUQRZY2V7322ITVOFSG4DWGR';
const adminKeypair = Keypair.fromSecret(adminSecret);
const adminAddress = adminKeypair.publicKey();
const dummyAccount = new Account(adminAddress, '0');

const contracts = {
  CORE_POOL: process.env.NEXT_PUBLIC_CORE_POOL_CONTRACT_ID,
  ORACLE_AGGREGATOR: process.env.NEXT_PUBLIC_ORACLE_AGGREGATOR_CONTRACT_ID,
  BACKSTOP: process.env.NEXT_PUBLIC_BACKSTOP_CONTRACT_ID,
  LIQUIDATION_ENGINE: process.env.NEXT_PUBLIC_LIQUIDATION_ENGINE_CONTRACT_ID,
  GOVERNANCE: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID,
  COMPLIANCE: process.env.NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID,
  USDC: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID,
  EURC: process.env.NEXT_PUBLIC_EURC_CONTRACT_ID,
  WBTC: process.env.NEXT_PUBLIC_WBTC_CONTRACT_ID,
  WETH: process.env.NEXT_PUBLIC_WETH_CONTRACT_ID,
  ERGO: process.env.NEXT_PUBLIC_ERGO_TOKEN_CONTRACT_ID,
};

async function restoreContract(name, contractId) {
  if (!contractId) return;
  console.log(`\nChecking restoration for ${name} (${contractId})...`);

  const contract = new Contract(contractId);
  // Build a dummy transaction that calls a simple read method (e.g. decimals or get_admin)
  const isPool = name === 'CORE_POOL' || name === 'BACKSTOP' || name === 'GOVERNANCE';
  const method = isPool ? 'get_all_markets' : 'decimals';
  const args = [];

  const tx = new TransactionBuilder(dummyAccount, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  
  // If the simulation indicates the contract is archived/expired, it returns restoreState
  if (sim.restoreState) {
    console.log(`Contract ${name} is expired. Attempting restoration...`);
    const account = await server.getAccount(adminAddress);
    
    const restoreTx = new TransactionBuilder(account, {
      fee: '100000', // high fee for Soroban
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.restoreFootprint({}))
      .setTimeout(60)
      .build();

    // Assemble with the simulation's restoreState
    const preparedRestoreTx = rpc.assembleTransaction(restoreTx, sim).build();
    preparedRestoreTx.sign(adminKeypair);
    
    console.log(`Submitting restore transaction...`);
    const response = await server.sendTransaction(preparedRestoreTx);
    if (response.status === 'ERROR') {
      console.error(`Restoration failed: ${JSON.stringify(response)}`);
      return;
    }
    
    let status = response.status;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const txResult = await server.getTransaction(response.hash);
      status = txResult.status;
      if (status === 'SUCCESS' || status === 'FAILED') break;
    }
    
    if (status === 'SUCCESS') {
      console.log(`✓ ${name} restored successfully!`);
    } else {
      console.error(`Restoration transaction failed or timed out.`);
    }
  } else if (rpc.Api.isSimulationError(sim)) {
    console.log(`Simulation error for ${name}: ${sim.error}`);
  } else {
    console.log(`✓ ${name} is active and does not require restoration.`);
  }
}

async function main() {
  for (const [name, id] of Object.entries(contracts)) {
    try {
      await restoreContract(name, id);
    } catch (e) {
      console.error(`Error restoring ${name}:`, e);
    }
  }
}

main().catch(console.error);
