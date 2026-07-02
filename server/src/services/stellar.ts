import { rpc, Contract, Address, scValToNative, xdr, TransactionBuilder, Account, Networks } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
dotenv.config();

const rpcUrl = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(rpcUrl);

// Dummy account for read-only simulations
const dummyAccount = new Account("GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", "0");

export async function getLivePrice(assetSymbol: string): Promise<number> {
  const contractId = process.env.ORACLE_AGGREGATOR_CONTRACT_ID;
  if (!contractId) return 0;
  
  try {
    const contract = new Contract(contractId);
    const sym = xdr.ScVal.scvSymbol(assetSymbol);
    const op = contract.call('get_price', sym);
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: Networks.TESTNET
    })
    .addOperation(op)
    .setTimeout(0)
    .build();

    const sim = await server.simulateTransaction(tx);
    const result = (sim as any).result;
    if (result?.retval) {
      const val = scValToNative(result.retval);
      return Number(val) / 10_000;
    }
  } catch (e) {
    console.error('Error fetching live price:', e);
  }
  return 0;
}

export async function getLivePosition(userAddress: string, marketId: string): Promise<any> {
  const contractId = process.env.CORE_POOL_CONTRACT_ID;
  if (!contractId) return null;

  try {
    const contract = new Contract(contractId);
    const simMarket = xdr.ScVal.scvSymbol(marketId);
    const simUser = Address.fromString(userAddress).toScVal();
    const op = contract.call('get_position', simMarket, simUser);
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: Networks.TESTNET
    })
    .addOperation(op)
    .setTimeout(0)
    .build();

    const sim = await server.simulateTransaction(tx);
    const result = (sim as any).result;
    if (result?.retval) {
      return scValToNative(result.retval);
    }
  } catch (e) {
    console.error('Error fetching live position:', e);
  }
  return null;
}

export async function getLiveHealthFactor(userAddress: string): Promise<number> {
  const contractId = process.env.CORE_POOL_CONTRACT_ID;
  if (!contractId) return 999999;

  try {
    const contract = new Contract(contractId);
    const simUser = Address.fromString(userAddress).toScVal();
    const simBool = xdr.ScVal.scvBool(false);
    const op = contract.call('get_user_health_factor', simUser, simBool);
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: Networks.TESTNET
    })
    .addOperation(op)
    .setTimeout(0)
    .build();

    const sim = await server.simulateTransaction(tx);
    const result = (sim as any).result;
    if (result?.retval) {
      const val = scValToNative(result.retval);
      return Number(val) / 10_000;
    }
  } catch (e) {
    console.error('Error fetching health factor:', e);
  }
  return 999999;
}
