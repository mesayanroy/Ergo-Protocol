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
  public checkpoints: Map<string, number> = new Map();
  public events: any[] = [];
  public markets: Map<string, any> = new Map();
  public users: Set<string> = new Set();
  public dailyMetrics: Map<string, any> = new Map();
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

  async upsertCheckpoint(name: string, ledger: number) {
    memoryStore.checkpoints.set(name, ledger);
    if (useDb && pool) {
      try {
        await pool.query(
          `INSERT INTO checkpoints (checkpoint_name, last_processed_ledger, updated_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (checkpoint_name) DO UPDATE SET last_processed_ledger = EXCLUDED.last_processed_ledger, updated_at = NOW()`,
          [name, ledger]
        );
      } catch (err: any) {
        console.error("Failed to upsert checkpoint:", err.message || err);
      }
    }
  },

  async getCheckpoint(name: string): Promise<number | null> {
    const mem = memoryStore.checkpoints.get(name);
    if (mem !== undefined) return mem;
    if (useDb && pool) {
      try {
        const res = await pool.query("SELECT last_processed_ledger FROM checkpoints WHERE checkpoint_name = $1", [name]);
        if (res.rows.length > 0) {
          const l = Number(res.rows[0].last_processed_ledger);
          memoryStore.checkpoints.set(name, l);
          return l;
        }
      } catch (err: any) {
        console.error("Failed to get checkpoint:", err.message || err);
      }
    }
    return null;
  },

  async logEvent(event: { contract_id: string, event_name: string, topics: string[], data: string, ledger_seq: number, tx_hash: string }) {
    memoryStore.events.push({ ...event, created_at: new Date() });
    if (useDb && pool) {
      try {
        await pool.query(
          `INSERT INTO events (contract_id, event_name, topics, data, ledger_seq, tx_hash, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [event.contract_id, event.event_name, event.topics, event.data, event.ledger_seq, event.tx_hash]
        );
      } catch (err: any) {
        console.error("Failed to log event:", err.message || err);
      }
    }
  },

  async upsertMarket(market: { market_id: string, pool_type: number, asset_address: string, total_supplied: number, total_borrowed: number, reserve_balance: number }) {
    memoryStore.markets.set(market.market_id, market);
    if (useDb && pool) {
      try {
        await pool.query(
          `INSERT INTO markets (market_id, pool_type, asset_address, total_supplied, total_borrowed, reserve_balance, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
           ON CONFLICT (market_id) DO UPDATE SET 
             total_supplied = EXCLUDED.total_supplied, 
             total_borrowed = EXCLUDED.total_borrowed, 
             reserve_balance = EXCLUDED.reserve_balance, 
             updated_at = NOW()`,
          [market.market_id, market.pool_type, market.asset_address, market.total_supplied, market.total_borrowed, market.reserve_balance]
        );
      } catch (err: any) {
        console.error("Failed to upsert market:", err.message || err);
      }
    }
  },

  async upsertUser(address: string) {
    memoryStore.users.add(address);
    if (useDb && pool) {
      try {
        await pool.query(
          `INSERT INTO users (user_address, active, updated_at) 
           VALUES ($1, true, NOW()) 
           ON CONFLICT (user_address) DO UPDATE SET updated_at = NOW()`,
          [address]
        );
      } catch (err: any) {
        console.error("Failed to upsert user:", err.message || err);
      }
    }
  },

  async getMarkets(): Promise<any[]> {
    if (useDb && pool) {
      try {
        const res = await pool.query("SELECT * FROM markets");
        return res.rows;
      } catch (err: any) {
        console.error("Failed to get markets:", err.message || err);
      }
    }
    return Array.from(memoryStore.markets.values());
  },

  async getDailyMetrics(): Promise<any[]> {
    if (useDb && pool) {
      try {
        const res = await pool.query("SELECT * FROM daily_metrics ORDER BY metric_date DESC LIMIT 30");
        return res.rows.reverse();
      } catch (err: any) {
        console.error("Failed to get daily metrics:", err.message || err);
      }
    }
    return Array.from(memoryStore.dailyMetrics.values());
  },

  async recordDailyMetric(metric: { tvl: number, utilization_rate: number, active_users: number, transaction_count: number, treasury_balance: number }) {
    const today = new Date().toISOString().split('T')[0];
    memoryStore.dailyMetrics.set(today, metric);
    if (useDb && pool) {
      try {
        await pool.query(
          `INSERT INTO daily_metrics (metric_date, tvl, utilization_rate, active_users, transaction_count, treasury_balance, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
           ON CONFLICT (metric_date) DO UPDATE SET 
             tvl = EXCLUDED.tvl, 
             utilization_rate = EXCLUDED.utilization_rate, 
             active_users = EXCLUDED.active_users, 
             transaction_count = EXCLUDED.transaction_count, 
             treasury_balance = EXCLUDED.treasury_balance`,
          [today, metric.tvl, metric.utilization_rate, metric.active_users, metric.transaction_count, metric.treasury_balance]
        );
      } catch (err: any) {
        console.error("Failed to record daily metric:", err.message || err);
      }
    }
  },

  async getStats(): Promise<any> {
    if (useDb && pool) {
      try {
        const marketsRes = await pool.query("SELECT SUM(total_supplied) as total_supplied, SUM(total_borrowed) as total_borrowed, SUM(reserve_balance) as reserve_balance FROM markets");
        const usersRes = await pool.query("SELECT COUNT(*) as total_users FROM users");
        const txsRes = await pool.query("SELECT COUNT(*) as total_txs FROM transactions");

        const totalSupplied = Number(marketsRes.rows[0]?.total_supplied || 0);
        const totalBorrowed = Number(marketsRes.rows[0]?.total_borrowed || 0);
        const totalReserves = Number(marketsRes.rows[0]?.reserve_balance || 0);
        const totalUsers = Number(usersRes.rows[0]?.total_users || 0);
        const totalTxs = Number(txsRes.rows[0]?.total_txs || 0);

        return {
          tvl: totalSupplied - totalBorrowed,
          totalSupplied,
          totalBorrowed,
          totalReserves,
          totalUsers,
          totalTxs
        };
      } catch (err: any) {
        console.error("Failed to fetch protocol stats:", err.message || err);
      }
    }

    let totalSupplied = 0;
    let totalBorrowed = 0;
    let totalReserves = 0;
    for (const m of memoryStore.markets.values()) {
      totalSupplied += Number(m.total_supplied || 0);
      totalBorrowed += Number(m.total_borrowed || 0);
      totalReserves += Number(m.reserve_balance || 0);
    }
    return {
      tvl: totalSupplied - totalBorrowed,
      totalSupplied,
      totalBorrowed,
      totalReserves,
      totalUsers: memoryStore.users.size || 12,
      totalTxs: memoryStore.events.length || 45
    };
  }
};