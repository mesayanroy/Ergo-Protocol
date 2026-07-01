import { db } from '../../server/src/db/index.js';

export async function triggerAuction(
  borrower: string,
  poolId: number,
  collateralAsset: string,
  collateralAmount: number,
  debtAsset: string,
  debtAmount: number,
) {
  console.log(`[LIQUIDATOR] Initializing Dutch Auction for unhealthy borrower ${borrower}...`);
  try {
    const id = Date.now();
    const start_ledger = 450000; // Mock starting ledger
    const auction = {
      id,
      user_address: borrower,
      pool_id: poolId,
      collateral_asset: collateralAsset,
      collateral_amount: collateralAmount,
      debt_asset: debtAsset,
      debt_amount: debtAmount,
      start_ledger,
      active: true,
    };
    await db.upsertAuction(auction);
    console.log(`[LIQUIDATOR SUCCESS] Auction ${id} created for borrower ${borrower}. Collateral: ${collateralAmount} ${collateralAsset}, Debt: ${debtAmount} ${debtAsset}.`);
  } catch (err) {
    console.error(`Failed to trigger auction for ${borrower}:`, err);
  }
}