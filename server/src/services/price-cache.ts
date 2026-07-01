import { db } from '../db/index.js';

export const priceCache = {
  async getPrice(asset: string): Promise<number> {
    return db.getPrice(asset);
  },

  async updatePrice(asset: string, price: number): Promise<void> {
    await db.upsertPrice(asset, price);
  }
};