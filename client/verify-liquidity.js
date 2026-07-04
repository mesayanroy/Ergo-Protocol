import { Contract, rpc, scValToNative, TransactionBuilder, Account } from '@stellar/stellar-sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const server = new rpc.Server(process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org');
const corePoolId = process.env.NEXT_PUBLIC_CORE_POOL_CONTRACT_ID || 'CCTXZNKEDNDA3ZGL6TQV2TSGNJ6HLUQCWXGIA6NOFKT53VESNDIYJRQH';

async function main() {
  console.log('=== ERGO PROTOCOL — VERIFY LIQUIDITY ===');
  console.log(`Core Pool ID: ${corePoolId}`);
  console.log(`RPC URL: ${server.serverURL}`);

  try {
    const contract = new Contract(corePoolId);
    const dummyAccount = new Account('GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL', '0');
    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: 'Test SDF Network ; September 2015',
    })
      .addOperation(contract.call('get_all_markets'))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation failed: ${sim.error}`);
    }

    if (sim.result?.retval) {
      const markets = scValToNative(sim.result.retval);
      console.log('\nOn-chain Pool Liquidity Status:');
      for (const m of markets) {
        console.log(`- Market: ${m.market_id}`);
        console.log(`  Total Supplied: ${(Number(m.total_supplied) / 10000000).toLocaleString()} tokens`);
        console.log(`  Total Borrowed: ${(Number(m.total_borrowed) / 10000000).toLocaleString()} tokens`);
        console.log(`  Supply APY: ${(Number(m.supply_apy) / 100000).toFixed(2)}%`);
        console.log(`  Borrow APY: ${(Number(m.borrow_apy) / 100000).toFixed(2)}%`);
        console.log(`  Paused: ${m.paused}`);
      }
    } else {
      console.log('No markets returned or pool not initialized.');
    }
  } catch (e) {
    console.error('Error verifying liquidity:', e);
  }
}

main().catch(console.error);
