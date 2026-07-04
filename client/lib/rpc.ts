import { Contract, rpc, TransactionBuilder, Networks, BASE_FEE } from '@stellar/stellar-sdk';

export const server = new rpc.Server(
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  { allowHttp: true }
);

export const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
  ? Networks.PUBLIC
  : Networks.TESTNET;

export const DUMMY_PUBLIC_KEY = 'GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL';

export async function simulateContractCall(
  contractId: string,
  method: string,
  args: any[],
  sourcePublicKey: string = DUMMY_PUBLIC_KEY
) {
  try {
    const contract = new Contract(contractId);
    const account = await server.getAccount(sourcePublicKey);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();
    return await server.simulateTransaction(tx);
  } catch (err) {
    console.error('Simulation error:', err);
    throw err;
  }
}
