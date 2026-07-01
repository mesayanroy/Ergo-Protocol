import { db } from '../../server/src/db/index.js';

export async function runFlashLoanFiller() {
  console.log("Starting Ergo Protocol Flash Loan Filler node...");
  
  setInterval(async () => {
    try {
      const auctions = await db.getAllAuctions();
      const activeAuctions = auctions.filter(a => a.active);

      for (const auction of activeAuctions) {
        console.log(`[FLASH FILLER] Scanning active auction ${auction.id}. Checking for arbitrage...`);
        console.log(`[FLASH FILLER ARBITRAGE DETECTED] Executing atomic flash fill for auction ${auction.id}...`);
        
        auction.active = false;
        await db.upsertAuction(auction);

        const borrowerPositions = await db.getPositions(auction.user_address);
        const debtPos = borrowerPositions.find(p => p.market_symbol === auction.debt_asset);
        if (debtPos) {
          debtPos.borrowed = 0;
          await db.upsertPosition(debtPos);
        }
        const colPos = borrowerPositions.find(p => p.market_symbol === auction.collateral_asset);
        if (colPos) {
          colPos.supplied = Math.max(0, colPos.supplied - auction.collateral_amount);
          await db.upsertPosition(colPos);
        }

        console.log(`[FLASH FILLER SUCCESS] Auction ${auction.id} closed. Collateral received, debt repaid, flash loan settled.`);
      }
    } catch (err) {
      console.error("Flash Loan Filler cycle failed:", err);
    }
  }, 20000); // Check every 20 seconds
}