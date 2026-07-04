import { Contract, rpc, TransactionBuilder, Account, Networks } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const server = new rpc.Server('https://soroban-testnet.stellar.org');
const dummyAccount = new Account('GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL', '0');

const contracts = {
  CORE_POOL: process.env.NEXT_PUBLIC_CORE_POOL_CONTRACT_ID,
  ORACLE_AGGREGATOR: process.env.NEXT_PUBLIC_ORACLE_AGGREGATOR_CONTRACT_ID,
  BACKSTOP: process.env.NEXT_PUBLIC_BACKSTOP_CONTRACT_ID,
  LIQUIDATION_ENGINE: process.env.NEXT_PUBLIC_LIQUIDATION_ENGINE_CONTRACT_ID,
  GOVERNANCE: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID,
  COMPLIANCE: process.env.NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID,
  USDC: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID,
  XLM_SAC: process.env.NEXT_PUBLIC_XLM_SAC,
  EURC: process.env.NEXT_PUBLIC_EURC_CONTRACT_ID,
  WBTC: process.env.NEXT_PUBLIC_WBTC_CONTRACT_ID,
  WETH: process.env.NEXT_PUBLIC_WETH_CONTRACT_ID,
  ERGO: process.env.NEXT_PUBLIC_ERGO_TOKEN_CONTRACT_ID,
};

async function checkContract(name, contractId) {
  if (!contractId) {
    console.log(`- ${name}: [Not set in env]`);
    return;
  }
  try {
    const contract = new Contract(contractId);
    // Try simulating a generic call (e.g. balance, symbol, decimals or get_admin)
    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call('decimals')) // standard for tokens
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      console.log(`- ${name} (${contractId}): [Simulation error: ${sim.error}]`);
    } else {
      console.log(`- ${name} (${contractId}): [Active (token)]`);
    }
  } catch (err) {
    // If decimals doesn't exist, try another method like get_admin or initialize
    try {
      const contract = new Contract(contractId);
      const tx = new TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call('get_all_markets'))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim) && sim.error.includes('MissingValue')) {
        console.log(`- ${name} (${contractId}): [Inactive/Not Found]`);
      } else {
        console.log(`- ${name} (${contractId}): [Active (pool)]`);
      }
    } catch (err2) {
      console.log(`- ${name} (${contractId}): [Error: ${err2.message}]`);
    }
  }
}

async function main() {
  console.log('Checking contract IDs on Testnet:');
  for (const [name, id] of Object.entries(contracts)) {
    await checkContract(name, id);
  }
}

main().catch(console.error);
