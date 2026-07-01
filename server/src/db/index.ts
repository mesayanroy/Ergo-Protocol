export interface PriceRecord {
  asset_symbol: string;
  price: number;
  updated_at?: Date;
}

export interface PositionRecord {
  user_address: string;
  market_symbol: string;
  supplied: number;
  borrowed: number;
  delegated: number;
  health_factor: number;
  updated_at?: Date;
}

export interface ProposalRecord {
  id: number;
  proposer: string;
  target_contract: string;
  action_name: string;
  votes_for: number;
  votes_against: number;
  end_time: number;
  executed: boolean;
  updated_at?: Date;
}

export interface AuctionRecord {
  id: number;
  user_address: string;
  pool_id: number;
  collateral_asset: string;
  collateral_amount: number;
  debt_asset: string;
  debt_amount: number;
  start_ledger: number;
  active: boolean;
  updated_at?: Date;
}

class MemoryDB {
  public prices: Map<string, PriceRecord> = new Map();
  public positions: Map<string, PositionRecord> = new Map();
  public proposals: Map<number, ProposalRecord> = new Map();
  public auctions: Map<number, AuctionRecord> = new Map();
}

export const memoryStore = new MemoryDB();

// Initialize starting mock values
memoryStore.prices.set("USDC", { asset_symbol: "USDC", price: 1.0 });
memoryStore.prices.set("XLM", { asset_symbol: "XLM", price: 0.12 });
memoryStore.prices.set("EURC", { asset_symbol: "EURC", price: 1.08 });

memoryStore.proposals.set(1, {
  id: 1,
  proposer: "GBX...GOV",
  target_contract: "CCPool...XYZ",
  action_name: "PAUSE",
  votes_for: 15000,
  votes_against: 450,
  end_time: Math.floor(Date.now() / 1000) + 86400,
  executed: false,
});

let pool: any = null;
try {
  const pgModule = await import("pg");
  if (process.env.DATABASE_URL) {
    pool = new pgModule.default.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
  }
} catch (e) {
  // pg module not loaded, fallback to memoryStore
}

export const db = {
  async query(text: string, params?: any[]) {
    if (pool) {
      return pool.query(text, params);
    }
    return { rows: [] };
  },

  async upsertPrice(symbol: string, price: number) {
    memoryStore.prices.set(symbol, { asset_symbol: symbol, price, updated_at: new Date() });
    if (pool) {
      await pool.query(
        `INSERT INTO prices (asset_symbol, price, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (asset_symbol) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()`,
        [symbol, price]
      );
    }
  },

  async getPrice(symbol: string): Promise<number> {
    const mem = memoryStore.prices.get(symbol);
    if (mem) return mem.price;
    if (pool) {
      const res = await pool.query("SELECT price FROM prices WHERE asset_symbol = $1", [symbol]);
      if (res.rows.length > 0) {
        const p = Number(res.rows[0].price);
        memoryStore.prices.set(symbol, { asset_symbol: symbol, price: p });
        return p;
      }
    }
    return 0;
  },

  async upsertPosition(pos: PositionRecord) {
    const key = `${pos.user_address}:${pos.market_symbol}`;
    memoryStore.positions.set(key, { ...pos, updated_at: new Date() });
    if (pool) {
      await pool.query(
        `INSERT INTO positions (user_address, market_symbol, supplied, borrowed, delegated, health_factor, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
         ON CONFLICT (user_address, market_symbol) DO UPDATE SET 
            supplied = EXCLUDED.supplied, 
            borrowed = EXCLUDED.borrowed, 
            delegated = EXCLUDED.delegated, 
            health_factor = EXCLUDED.health_factor, 
            updated_at = NOW()`,
        [pos.user_address, pos.market_symbol, pos.supplied, pos.borrowed, pos.delegated, pos.health_factor]
      );
    }
  },

  async getPositions(user: string): Promise<PositionRecord[]> {
    const res: PositionRecord[] = [];
    for (const [_, val] of memoryStore.positions.entries()) {
      if (val.user_address.toLowerCase() === user.toLowerCase()) {
        res.push(val);
      }
    }
    if (res.length > 0) return res;

    if (pool) {
      const dbRes = await pool.query("SELECT * FROM positions WHERE user_address = $1", [user]);
      dbRes.rows.forEach((row: any) => {
        const record: PositionRecord = {
          user_address: row.user_address,
          market_symbol: row.market_symbol,
          supplied: Number(row.supplied),
          borrowed: Number(row.borrowed),
          delegated: Number(row.delegated),
          health_factor: Number(row.health_factor),
        };
        memoryStore.positions.set(`${row.user_address}:${row.market_symbol}`, record);
        res.push(record);
      });
    }
    return res;
  },

  async upsertProposal(prop: ProposalRecord) {
    memoryStore.proposals.set(prop.id, { ...prop, updated_at: new Date() });
    if (pool) {
      await pool.query(
        `INSERT INTO proposals (id, proposer, target_contract, action_name, votes_for, votes_against, end_time, executed, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
         ON CONFLICT (id) DO UPDATE SET 
            votes_for = EXCLUDED.votes_for, 
            votes_against = EXCLUDED.votes_against, 
            executed = EXCLUDED.executed, 
            updated_at = NOW()`,
        [prop.id, prop.proposer, prop.target_contract, prop.action_name, prop.votes_for, prop.votes_against, prop.end_time, prop.executed]
      );
    }
  },

  async getProposal(id: number): Promise<ProposalRecord | null> {
    const mem = memoryStore.proposals.get(id);
    if (mem) return mem;
    if (pool) {
      const res = await pool.query("SELECT * FROM proposals WHERE id = $1", [id]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const record: ProposalRecord = {
          id: Number(row.id),
          proposer: row.proposer,
          target_contract: row.target_contract,
          action_name: row.action_name,
          votes_for: Number(row.votes_for),
          votes_against: Number(row.votes_against),
          end_time: Number(row.end_time),
          executed: row.executed,
        };
        memoryStore.proposals.set(id, record);
        return record;
      }
    }
    return null;
  },

  async getAllProposals(): Promise<ProposalRecord[]> {
    if (pool) {
      const res = await pool.query("SELECT * FROM proposals ORDER BY id DESC");
      return res.rows.map((row: any) => ({
        id: Number(row.id),
        proposer: row.proposer,
        target_contract: row.target_contract,
        action_name: row.action_name,
        votes_for: Number(row.votes_for),
        votes_against: Number(row.votes_against),
        end_time: Number(row.end_time),
        executed: row.executed,
      }));
    }
    return Array.from(memoryStore.proposals.values());
  },

  async upsertAuction(auc: AuctionRecord) {
    memoryStore.auctions.set(auc.id, { ...auc, updated_at: new Date() });
    if (pool) {
      await pool.query(
        `INSERT INTO auctions (id, user_address, pool_id, collateral_asset, collateral_amount, debt_asset, debt_amount, start_ledger, active, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
         ON CONFLICT (id) DO UPDATE SET 
            collateral_amount = EXCLUDED.collateral_amount, 
            debt_amount = EXCLUDED.debt_amount, 
            active = EXCLUDED.active, 
            updated_at = NOW()`,
        [auc.id, auc.user_address, auc.pool_id, auc.collateral_asset, auc.collateral_amount, auc.debt_asset, auc.debt_amount, auc.start_ledger, auc.active]
      );
    }
  },

  async getAllAuctions(): Promise<AuctionRecord[]> {
    if (pool) {
      const res = await pool.query("SELECT * FROM auctions ORDER BY id DESC");
      return res.rows.map((row: any) => ({
        id: Number(row.id),
        user_address: row.user_address,
        pool_id: Number(row.pool_id),
        collateral_asset: row.collateral_asset,
        collateral_amount: Number(row.collateral_amount),
        debt_asset: row.debt_asset,
        debt_amount: Number(row.debt_amount),
        start_ledger: Number(row.start_ledger),
        active: row.active,
      }));
    }
    return Array.from(memoryStore.auctions.values());
  },
};