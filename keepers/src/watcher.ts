import { db } from '../../server/src/db/index.js';

export async function runWatcher() {
  console.log("Starting Ergo Protocol Watcher node...");
  
  setInterval(async () => {
    try {
      console.log("Auditing active collateral and debt accounts...");
      
      // Pull unique user addresses from the positions table
      const positions = Array.from(db.memoryStore.positions.values());
      const uniqueUsers = Array.from(new Set(positions.map(p => p.user_address)));

      for (const user of uniqueUsers) {
        const userPositions = await db.getPositions(user);
        const minHf = userPositions.reduce((acc, curr) => Math.min(acc, curr.health_factor), 999999);
        
        if (minHf < 1.0) {
          console.warn(`[WATCHER ALERT] Account ${user} is unhealthy! Health Factor: ${minHf}. Directing to liquidator.`);
        }
      }
    } catch (err) {
      console.error("Watcher audit cycle failed:", err);
    }
  }, 15000); // Audit every 15 seconds
}