import { Contract, TransactionBuilder, Account, Address, BASE_FEE, xdr, nativeToScVal } from '@stellar/stellar-sdk';
import { simulateContractCall, server, NETWORK_PASSPHRASE } from './rpc';
import { config } from './config';



export interface TransactionOverview {
  gasFee: string;
  suppliedBefore: number;
  suppliedAfter: number;
  borrowedBefore: number;
  borrowedAfter: number;
  borrowCapacityBefore: number;
  borrowCapacityAfter: number;
  borrowLimitPercentBefore: number;
  borrowLimitPercentAfter: number;
  healthFactorBefore: number;
  healthFactorAfter: number;
}

export async function buildApproveTx(
  userAddress: string,
  assetContractId: string,
  amount: bigint,
  spenderAddress?: string
): Promise<string> {
  const spender = spenderAddress || config.contracts.corePool;
  const account = await server.getAccount(userAddress);

  let latestLedger = 9999999;
  try {
    const latestLedgerRes = await server.getLatestLedger();
    latestLedger = latestLedgerRes.sequence;
  } catch (err) {
    console.warn("Failed to get latest ledger, using default", err);
  }
  const expirationLedger = latestLedger + 10000;

  const tokenContract = new Contract(assetContractId);
  const approveOp = tokenContract.call(
    'approve',
    Address.fromString(userAddress).toScVal(),
    Address.fromString(spender).toScVal(),
    nativeToScVal(amount, { type: 'i128' }),
    nativeToScVal(expirationLedger, { type: 'u32' })
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE
  })
  .addOperation(approveOp)
  .setTimeout(30)
  .build();

  return tx.toXDR();
}

export async function buildSupplyTx(
  userAddress: string,
  marketId: string,
  amount: bigint
): Promise<string> {
  const account = await server.getAccount(userAddress);

  // 1. Build supply call
  const coreContract = new Contract(config.contracts.corePool);
  const supplyOp = coreContract.call(
    'supply',
    Address.fromString(userAddress).toScVal(),
    nativeToScVal(marketId, { type: 'symbol' }),
    nativeToScVal(amount, { type: 'i128' })
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE
  })
  .addOperation(supplyOp)
  .setTimeout(30)
  .build();

  return tx.toXDR();
}

export async function buildBorrowTx(
  userAddress: string,
  marketId: string,
  amount: bigint
): Promise<string> {
  const account = await server.getAccount(userAddress);

  const coreContract = new Contract(config.contracts.corePool);
  const borrowOp = coreContract.call(
    'borrow',
    Address.fromString(userAddress).toScVal(),
    nativeToScVal(marketId, { type: 'symbol' }),
    nativeToScVal(amount, { type: 'i128' })
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE
  })
  .addOperation(borrowOp)
  .setTimeout(30)
  .build();

  return tx.toXDR();
}

export async function buildRepayTx(
  userAddress: string,
  marketId: string,
  amount: bigint
): Promise<string> {
  const account = await server.getAccount(userAddress);

  const coreContract = new Contract(config.contracts.corePool);
  const repayOp = coreContract.call(
    'repay',
    Address.fromString(userAddress).toScVal(),
    nativeToScVal(marketId, { type: 'symbol' }),
    nativeToScVal(amount, { type: 'i128' })
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE
  })
  .addOperation(repayOp)
  .setTimeout(30)
  .build();

  return tx.toXDR();
}

export async function buildWithdrawTx(
  userAddress: string,
  marketId: string,
  amount: bigint
): Promise<string> {
  const account = await server.getAccount(userAddress);

  const coreContract = new Contract(config.contracts.corePool);
  const withdrawOp = coreContract.call(
    'withdraw',
    Address.fromString(userAddress).toScVal(),
    nativeToScVal(marketId, { type: 'symbol' }),
    nativeToScVal(amount, { type: 'i128' })
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE
  })
  .addOperation(withdrawOp)
  .setTimeout(30)
  .build();

  return tx.toXDR();
}

export async function buildBackstopDepositTx(
  userAddress: string,
  poolId: number,
  amount: bigint
): Promise<string> {
  const backstopId = config.contracts.backstop || '';
  const account = await server.getAccount(userAddress);

  // 1. Call deposit
  const backstopContract = new Contract(backstopId);
  const depositOp = backstopContract.call(
    'deposit',
    Address.fromString(userAddress).toScVal(),
    nativeToScVal(poolId, { type: 'u32' }),
    nativeToScVal(amount, { type: 'i128' })
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE
  })
  .addOperation(depositOp)
  .setTimeout(30)
  .build();

  return tx.toXDR();
}

export async function buildBackstopWithdrawTx(
  userAddress: string,
  poolId: number,
  amount: bigint
): Promise<string> {
  const backstopId = config.contracts.backstop || '';
  const account = await server.getAccount(userAddress);

  const backstopContract = new Contract(backstopId);
  const withdrawOp = backstopContract.call(
    'queue_withdrawal',
    Address.fromString(userAddress).toScVal(),
    nativeToScVal(poolId, { type: 'u32' }),
    nativeToScVal(amount, { type: 'i128' })
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE
  })
  .addOperation(withdrawOp)
  .setTimeout(30)
  .build();

  return tx.toXDR();
}

export async function simulateTransactionImpact(
  userAddress: string,
  action: 'supply' | 'borrow' | 'repay' | 'withdraw',
  marketId: string,
  amount: number,
  assetPrice: number
): Promise<TransactionOverview> {
  const baseline: TransactionOverview = {
    gasFee: '0.015',
    suppliedBefore: 1500,
    suppliedAfter: 1500,
    borrowedBefore: 1200,
    borrowedAfter: 1200,
    borrowCapacityBefore: 3000,
    borrowCapacityAfter: 3000,
    borrowLimitPercentBefore: 40.0,
    borrowLimitPercentAfter: 40.0,
    healthFactorBefore: 1.84,
    healthFactorAfter: 1.84
  };

  if (!userAddress) return baseline;

  try {
    const change = amount * assetPrice;
    if (action === 'supply') {
      baseline.suppliedAfter = baseline.suppliedBefore + amount;
      baseline.borrowCapacityAfter = baseline.borrowCapacityBefore + (change * 0.85);
      baseline.borrowLimitPercentAfter = (baseline.borrowedBefore / baseline.borrowCapacityAfter) * 100;
      baseline.healthFactorAfter = baseline.healthFactorBefore + 0.15;
    } else if (action === 'borrow') {
      baseline.borrowedAfter = baseline.borrowedBefore + amount;
      baseline.borrowCapacityAfter = baseline.borrowCapacityBefore;
      baseline.borrowLimitPercentAfter = (baseline.borrowedAfter / baseline.borrowCapacityBefore) * 100;
      baseline.healthFactorAfter = Math.max(1.01, baseline.healthFactorBefore - 0.25);
    } else if (action === 'repay') {
      baseline.borrowedAfter = Math.max(0, baseline.borrowedBefore - amount);
      baseline.borrowCapacityAfter = baseline.borrowCapacityBefore;
      baseline.borrowLimitPercentAfter = (baseline.borrowedAfter / baseline.borrowCapacityBefore) * 100;
      baseline.healthFactorAfter = baseline.healthFactorBefore + 0.20;
    } else if (action === 'withdraw') {
      baseline.suppliedAfter = Math.max(0, baseline.suppliedBefore - amount);
      baseline.borrowCapacityAfter = Math.max(0, baseline.borrowCapacityBefore - (change * 0.85));
      baseline.borrowLimitPercentAfter = (baseline.borrowedBefore / Math.max(1, baseline.borrowCapacityAfter)) * 100;
      baseline.healthFactorAfter = Math.max(1.00, baseline.healthFactorBefore - 0.18);
    }
  } catch (e) {
    console.error('Impact simulation failed:', e);
  }

  return baseline;
}
