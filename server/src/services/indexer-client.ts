import { db, PositionRecord } from '../db/index.js';

export const indexerClient = {
  async getUserPositions(userAddress: string): Promise<PositionRecord[]> {
    return db.getPositions(userAddress);
  },

  async updateUserPosition(pos: PositionRecord): Promise<void> {
    await db.upsertPosition(pos);
  }
};