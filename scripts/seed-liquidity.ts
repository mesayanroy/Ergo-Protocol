import {
  Keypair, Contract, rpc, TransactionBuilder,
  Networks, BASE_FEE, nativeToScVal, Address
} from '@stellar/stellar-sdk';
import * as dotenv from 'dotenv';
dotenv.config();

const server = new rpc.Server(process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org');
const adminKeypair = Keypair.fromSecret(process.env.ADMIN_SECRET_KEY || 'SAI52RPAJAGGLXRL5WUTXQSM7F76K5L5IJV3D3R6K2Q37U2U3J5J3HHY');
const NETWORK = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

// Seed amounts — enough to make pools look real and borrowable
const SEED_CONFIG = [
  {
    market_id: 'xlm_shared',
    asset_contract: process.env.NEXT_PUBLIC_XLM_SAC || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    amount: 500_000_0000000n,      // 500,000 XLM
    label: 'XLM Shared Core'
  },
  {
    market_id: 'usdc_shared',
    asset_contract: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    amount: 50_000_0000000n,       // 50,000 USDC
    label: 'USDC Shared Core'
  },
  {
    market_id: 'eurc_shared',
    asset_contract: process.env.NEXT_PUBLIC_EURC_CONTRACT_ID || 'CCMP7RPAJAGGLXRL5WUTXQSM7F76K5L5IJV3D3R6K2Q37U2U3J5J3HHY',
    amount: 30_000_0000000n,       // 30,000 EURC
    label: 'EURC Shared Core'
  },
  {
    market_id: 'wbtc_satellite',
    asset_contract: process.env.NEXT_PUBLIC_WBTC_CONTRACT_ID || 'CBKF3DIVWXW37KIWM74WFZRYFMWBLJZFMB6GUP3MVGUSUPKJTJVLNPJ',
    amount: 5_0000000n,            // 5 wBTC
    label: 'wBTC Satellite'
  },
  {
    market_id: 'weth_satellite',
    asset_contract: process.env.NEXT_PUBLIC_WETH_CONTRACT_ID || 'CGVN6RPAJAGGLXRL5WUTXQSM7F76K5L5IJV3D3R6K2Q37U2U3J5J3HHY',
    amount: 50_0000000n,           // 50 wETH
    label: 'wETH Satellite'
  },
];

async function invokeContract(
  contractId: string,
  method: string,
  args: any[]
): Promise<string> {
  const contract = new Contract(contractId);
  const account = await server.getAccount(adminKeypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = rpc.assembleTransaction(tx, simResult).build();
  preparedTx.sign(adminKeypair);

  const sendResult = await server.sendTransaction(preparedTx);
  if (sendResult.status === 'ERROR') throw new Error((sendResult as any).errorResult?.toString() || 'Transaction send failed');

  // Poll for confirmation
  let getResult = await server.getTransaction(sendResult.hash);
  while (getResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise(r => setTimeout(r, 2000));
    getResult = await server.getTransaction(sendResult.hash);
  }

  if (getResult.status === rpc.Api.GetTransactionStatus.FAILED) {
    throw new Error(`Transaction failed: ${sendResult.hash}`);
  }

  return sendResult.hash;
}

async function seedMarket(config: typeof SEED_CONFIG[0]) {
  if (!config.asset_contract) {
    console.log(`Skipping ${config.label} - asset contract not defined`);
    return;
  }
  console.log(`\nSeeding ${config.label}...`);

  // Step 1: Approve Core Pool to spend admin's tokens
  const approveHash = await invokeContract(config.asset_contract, 'approve', [
    Address.fromString(adminKeypair.publicKey()).toScVal(),
    Address.fromString(process.env.NEXT_PUBLIC_CORE_POOL_CONTRACT_ID || 'CCTXZNKEDNDA3ZGL6TQV2TSGNJ6HLUQCWXGIA6NOFKT53VESNDIYJRQH').toScVal(),
    nativeToScVal(config.amount, { type: 'i128' }),
    nativeToScVal(500, { type: 'u32' }), // expiration ledger offset
  ]);
  console.log(`  Approved: ${approveHash}`);

  // Step 2: Supply into Core Pool
  const supplyHash = await invokeContract(
    process.env.NEXT_PUBLIC_CORE_POOL_CONTRACT_ID || 'CCTXZNKEDNDA3ZGL6TQV2TSGNJ6HLUQCWXGIA6NOFKT53VESNDIYJRQH',
    'supply',
    [
      Address.fromString(adminKeypair.publicKey()).toScVal(),
      nativeToScVal(config.market_id, { type: 'symbol' }),
      nativeToScVal(config.amount, { type: 'i128' }),
    ]
  );
  console.log(`  Supplied: ${supplyHash}`);
  console.log(`  ✓ ${config.label} seeded`);
}

async function main() {
  console.log('=== ERGO PROTOCOL — LIQUIDITY SEEDING ===');
  console.log(`Admin: ${adminKeypair.publicKey()}`);

  const account = await server.getAccount(adminKeypair.publicKey());
  console.log(`Account sequence: ${account.sequenceNumber()}`);

  for (const config of SEED_CONFIG) {
    await seedMarket(config);
  }

  console.log('\n=== SEEDING COMPLETE ===');
  console.log('All markets now have real protocol-owned liquidity.');
}

main().catch(console.error);
