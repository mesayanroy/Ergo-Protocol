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
  title: string;
  description: string;
  status: string;
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
  proposer: "GA5W25PPHD6UUXKLQ5K5ZRP34BR7NSJJLSS76NHH273QVA5XLM4",
  target_contract: "CCTXZNKEDNDA3ZGL6TQV2TSGNJ6HLUQCWXGIA6NOFKT53VESNDIYJRQH",
  action_name: "set_collateral_factor",
  title: "Increase XLM Collateral Factor to 70%",
  description: "Upgrade the risk parameters of the XLM liquidity pool based on decreased volatility limits.",
  status: "Active",
  votes_for: 1245000,
  votes_against: 421000,
  end_time: Math.floor(Date.now() / 1000) + 172800,
  executed: false,
});

memoryStore.proposals.set(2, {
  id: 2,
  proposer: "GB3KUSDC5NTCQZUV33M2QT6RKLQ5K5ZRP34BR7NSJJLSS76NHH273QVA5",
  target_contract: "CBGN37EGC2VTOTROLR72BGCXEBZF2JGVHPPPN36IFKLVXBQLY3SXST6E",
  action_name: "deploy_vault",
  title: "Integrate EURC Dutch Liquidity Vault",
  description: "Deploy automated Dutch auction settlement smart contracts for non-custodial EURC liquidation.",
  status: "Active",
  votes_for: 2840000,
  votes_against: 95000,
  end_time: Math.floor(Date.now() / 1000) + 345600,
  executed: false,
});

memoryStore.proposals.set(3, {
  id: 3,
  proposer: "GC9QERGOOSX3JTEOHRSCKC3WWUOB4ZHOCEUXKI3NE6MU3XYDYSZVCX57",
  target_contract: "CDDA6FMHKC7Q6FY3D6HGTV273BKX7XJO5UHKFXDGN7VA6CDXGGFF7QPR",
  action_name: "upgrade_oracle",
  title: "Enable Soroban Oracle Multi-Feed Circuit Breaker",
  description: "Upgrade protocol price queries to fetch aggregated Reflector and DEX TWAP averages.",
  status: "Executed",
  votes_for: 4890000,
  votes_against: 12000,
  end_time: Math.floor(Date.now() / 1000) - 86400,
  executed: true,
});

let pool: any = null;
let useDb = false;

try {
  const pgModule = await import("pg");
  if (process.env.DATABASE_URL) {
    pool = new pgModule.default.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
    // Verify database connectivity
    await pool.query("SELECT 1");
    useDb = true;
    console.log("✓ PostgreSQL Database connected and verified successfully.");
  }
} catch (e: any) {
  console.warn("⚠️ Database connection failed, falling back to memory store:", e.message || e);
  pool = null;
  useDb = false;
}

export const db = {
  async query(text: string, params?: any[]) {
    if (useDb && pool) {
      try {
        return await pool.query(text, params);
      } catch (err: any) {
        console.error("Database query failed:", err.message || err);
      }
    }
    return { rows: [] };
  },

  async upsertPrice(symbol: string, price: number) {
    memoryStore.prices.set(symbol, { asset_symbol: symbol, price, updated_at: new Date() });
    if (useDb && pool) {
      try {
        await pool.query(
          `INSERT INTO prices (asset_symbol, price, updated_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (asset_symbol) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()`,
          [symbol, price]
        );
      } catch (err: any) {
        console.error("Failed to upsert price in database:", err.message || err);
      }
    }
  },

  async getPrice(symbol: string): Promise<number> {
    const mem = memoryStore.prices.get(symbol);
    if (mem) return mem.price;
    if (useDb && pool) {
      try {
        const res = await pool.query("SELECT price FROM prices WHERE asset_symbol = $1", [symbol]);
        if (res.rows.length > 0) {
          const p = Number(res.rows[0].price);
          memoryStore.prices.set(symbol, { asset_symbol: symbol, price: p });
          return p;
        }
      } catch (err: any) {
        console.error("Failed to fetch price from database:", err.message || err);
      }
    }
    return 0;
  },

  async upsertPosition(pos: PositionRecord) {
    const key = `${pos.user_address}:${pos.market_symbol}`;
    memoryStore.positions.set(key, { ...pos, updated_at: new Date() });
    if (useDb && pool) {
      try {
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
      } catch (err: any) {
        console.error("Failed to upsert position in database:", err.message || err);
      }
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

    if (useDb && pool) {
      try {
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
      } catch (err: any) {
        console.error("Failed to get positions from database:", err.message || err);
      }
    }
    return res;
  },

  async upsertProposal(prop: ProposalRecord) {
    memoryStore.proposals.set(prop.id, { ...prop, updated_at: new Date() });
    if (useDb && pool) {
      try {
        await pool.query(
          `INSERT INTO proposals (proposal_id, proposal_type, title, description, proposer, status, votes_for, votes_against, voting_ends_at, executed_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TO_TIMESTAMP($9), $10) 
           ON CONFLICT (proposal_id) DO UPDATE SET 
              votes_for = EXCLUDED.votes_for, 
              votes_against = EXCLUDED.votes_against, 
              status = EXCLUDED.status,
              executed_at = EXCLUDED.executed_at`,
          [
            prop.id, 
            prop.action_name, 
            prop.title, 
            prop.description, 
            prop.proposer, 
            prop.status, 
            prop.votes_for, 
            prop.votes_against, 
            prop.end_time, 
            prop.executed ? new Date() : null
          ]
        );
      } catch (err: any) {
        console.error("Failed to upsert proposal in database:", err.message || err);
      }
    }
  },

  async getProposal(id: number): Promise<ProposalRecord | null> {
    const mem = memoryStore.proposals.get(id);
    if (mem) return mem;
    if (useDb && pool) {
      try {
        const res = await pool.query("SELECT * FROM proposals WHERE proposal_id = $1", [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const record: ProposalRecord = {
            id: Number(row.proposal_id),
            proposer: row.proposer,
            target_contract: "",
            action_name: row.proposal_type || "",
            title: row.title || "",
            description: row.description || "",
            status: row.status || "Active",
            votes_for: Number(row.votes_for || 0),
            votes_against: Number(row.votes_against || 0),
            end_time: Math.floor(new Date(row.voting_ends_at || Date.now()).getTime() / 1000),
            executed: row.status === 'executed',
          };
          memoryStore.proposals.set(id, record);
          return record;
        }
      } catch (err: any) {
        console.error("Failed to get proposal from database:", err.message || err);
      }
    }
    return null;
  },

  async getAllProposals(): Promise<ProposalRecord[]> {
    if (useDb && pool) {
      try {
        const res = await pool.query("SELECT * FROM proposals ORDER BY proposal_id DESC");
        return res.rows.map((row: any) => ({
          id: Number(row.proposal_id),
          proposer: row.proposer,
          target_contract: "",
          action_name: row.proposal_type || "",
          title: row.title || "",
          description: row.description || "",
          status: row.status || "Active",
          votes_for: Number(row.votes_for || 0),
          votes_against: Number(row.votes_against || 0),
          end_time: Math.floor(new Date(row.voting_ends_at || Date.now()).getTime() / 1000),
          executed: row.status === 'executed',
        }));
      } catch (err: any) {
        console.error("Failed to get all proposals from database:", err.message || err);
      }
    }
    return Array.from(memoryStore.proposals.values());
  },

  async upsertAuction(auc: AuctionRecord) {
    memoryStore.auctions.set(auc.id, { ...auc, updated_at: new Date() });
    if (useDb && pool) {
      try {
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
      } catch (err: any) {
        console.error("Failed to upsert auction in database:", err.message || err);
      }
    }
  },

  async getAllAuctions(): Promise<AuctionRecord[]> {
    if (useDb && pool) {
      try {
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
      } catch (err: any) {
        console.error("Failed to get all auctions from database:", err.message || err);
      }
    }
    return Array.from(memoryStore.auctions.values());
  },
};