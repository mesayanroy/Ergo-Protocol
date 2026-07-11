import { Contract, rpc, TransactionBuilder, Networks, BASE_FEE, Account } from '@stellar/stellar-sdk';
import { NETWORK_CONFIG, setNetworkConfig } from './config';

export let server = new rpc.Server(
  NETWORK_CONFIG.mainnet.rpc,
  { allowHttp: true }
);

export let NETWORK_PASSPHRASE = NETWORK_CONFIG.mainnet.passphrase;

export function setRpcNetwork(network: 'mainnet' | 'testnet') {
  setNetworkConfig(network);
  const activeConfig = NETWORK_CONFIG[network];
  server = new rpc.Server(activeConfig.rpc, { allowHttp: true });
  NETWORK_PASSPHRASE = activeConfig.passphrase;
}

export const DUMMY_PUBLIC_KEY = 'GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL';

export async function simulateContractCall(
  contractId: string,
  method: string,
  args: any[],
  sourcePublicKey: string = DUMMY_PUBLIC_KEY
) {
  if (!contractId || contractId.length !== 56 || !contractId.startsWith('C')) {
    console.warn(`[rpc] Skipping simulation: contract ID "${contractId}" is not deployed yet.`);
    return { result: { retval: null } };
  }
  try {
    const contract = new Contract(contractId);
    let account;
    try {
      account = await server.getAccount(sourcePublicKey);
    } catch (e) {
      account = new Account(sourcePublicKey, '0');
    }
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();
    return await server.simulateTransaction(tx);
  } catch (err) {
    console.warn(`[rpc] Simulation failed gracefully for contract ${contractId}:`, err);
    return { result: { retval: null } } as any;
  }
}
