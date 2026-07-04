import { Contract, rpc, TransactionBuilder, Account, Networks, Address } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const server = new rpc.Server('https://soroban-testnet.stellar.org');
const dummyAccount = new Account('GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL', '0');
const corePoolId = 'CCTXZNKEDNDA3ZGL6TQV2TSGNJ6HLUQCWXGIA6NOFKT53VESNDIYJRQH';

async function main() {
  console.log(`Testing initialize on existing core pool ID: ${corePoolId}`);
  try {
    const contract = new Contract(corePoolId);
    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call('initialize', Address.fromString('GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL').toScVal()))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    console.log(`Simulation result:`, JSON.stringify(sim, null, 2));
  } catch (err) {
    console.error('Error simulating initialize:', err);
  }
}

main().catch(console.error);
