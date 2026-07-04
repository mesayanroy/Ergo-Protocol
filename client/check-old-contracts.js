import { Contract, rpc, TransactionBuilder, Account, Networks } from '@stellar/stellar-sdk';

const server = new rpc.Server('https://soroban-testnet.stellar.org');
const dummyAccount = new Account('GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL', '0');

const contracts = {
  CORE_POOL: 'CB7GWDV4TFLRZZG7SZW7D5KCSJWSD3W6D2Q37U2U3J5J3HHYCCPPOOL',
  ORACLE_AGGREGATOR: 'CBKF3DIVWXW37KIWM74WFZRYFMWBLJZFMB6GUP3MVGUSUPKJTJVLNPJ',
  BACKSTOP: 'CCBS4RPAJAGGLXRL5WUTXQSM7F76K5L5IJV3D3R6K2Q37U2U3J5J3HHY',
  LIQUIDATION_ENGINE: 'CDLE5PAJAGGLXRL5WUTXQSM7F76K5L5IJV3D3R6K2Q37U2U3J5J3HHY',
  GOVERNANCE: 'CGVN6RPAJAGGLXRL5WUTXQSM7F76K5L5IJV3D3R6K2Q37U2U3J5J3HHY',
  COMPLIANCE: 'CCMP7RPAJAGGLXRL5WUTXQSM7F76K5L5IJV3D3R6K2Q37U2U3J5J3HHY',
  XLM_SAC: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  USDC: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
};

async function checkContract(name, contractId) {
  try {
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call('decimals'))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      console.log(`- ${name} (${contractId}): [Decimals failed, trying get_all_markets]`);
      // Try get_all_markets
      const tx2 = new TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call('get_all_markets'))
        .setTimeout(30)
        .build();
      const sim2 = await server.simulateTransaction(tx2);
      if (rpc.Api.isSimulationError(sim2)) {
        console.log(`  - get_all_markets failed: ${sim2.error}`);
      } else {
        console.log(`  - ${name} (${contractId}): [Active (pool)]`);
      }
    } else {
      console.log(`- ${name} (${contractId}): [Active (token)]`);
    }
  } catch (err) {
    console.log(`- ${name} (${contractId}): [Error: ${err.message}]`);
  }
}

async function main() {
  console.log('Checking old contract IDs on Testnet:');
  for (const [name, id] of Object.entries(contracts)) {
    await checkContract(name, id);
  }
}

main().catch(console.error);
