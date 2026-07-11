import { rpc, Contract, Address, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { db } from '../db/index.js';

const rpcUrl = process.env.SOROBAN_RPC_URL || 'https://mainnet.sorobanrpc.com';
const server = new rpc.Server(rpcUrl);

const indexerName = 'ergo_indexer';

// Helper sleep function
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class ErgoIndexerService {
  private active: boolean = false;
  private intervalMs: number = 6000; // Poll every 6s (Stellar ledger block time)

  public async start() {
    if (this.active) return;
    this.active = true;
    console.log(`🚀 Ergo Event Indexer Service started polling ${rpcUrl}`);
    this.runLoop();
  }

  public async stop() {
    this.active = false;
    console.log('⏹ Ergo Event Indexer Service stopped.');
  }

  private async runLoop() {
    while (this.active) {
      try {
        await this.indexNextBatch();
      } catch (err: any) {
        console.error('❌ Indexer loop execution error:', err.message || err);
      }
      await sleep(this.intervalMs);
    }
  }

  private async indexNextBatch() {
    const contracts = {
      corePool: process.env.NEXT_PUBLIC_CORE_POOL_CONTRACT_ID,
      oracleAggregator: process.env.NEXT_PUBLIC_ORACLE_AGGREGATOR_CONTRACT_ID,
      backstop: process.env.NEXT_PUBLIC_BACKSTOP_CONTRACT_ID,
      liquidationEngine: process.env.NEXT_PUBLIC_LIQUIDATION_ENGINE_CONTRACT_ID,
      governance: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID,
      compliance: process.env.NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID,
      ergoToken: process.env.NEXT_PUBLIC_ERGO_TOKEN_CONTRACT_ID
    };

    // Skip if core contracts aren't deployed/configured yet
    if (!contracts.corePool) {
      return;
    }

    // Determine starting ledger sequence
    let startLedger = await db.getCheckpoint(indexerName);
    const latestLedgerRes = await this.queryWithRetry(() => server.getLatestLedger());
    const latestLedger = latestLedgerRes.sequence;

    if (!startLedger) {
      startLedger = latestLedger - 100; // Default fallback to 100 blocks back
    }

    if (startLedger >= latestLedger) {
      return;
    }

    const endLedger = Math.min(startLedger + 50, latestLedger);
    console.log(`[Indexer] Fetching events from ledger ${startLedger} to ${endLedger}...`);

    // Fetch and process events
    const filterIds = Object.values(contracts).filter(Boolean) as string[];
    const eventsResponse = await this.queryWithRetry(() =>
      server.getEvents({
        startLedger,
        filters: filterIds.map(cid => ({
          type: 'contract',
          contractIds: [cid]
        })),
        limit: 100
      })
    );

    for (const evt of eventsResponse.events) {
      try {
        await this.processEvent(evt);
      } catch (err: any) {
        console.error(`Failed to process event ${evt.id}:`, err.message || err);
      }
    }

    // Sync live contract state for active markets to PostgreSQL
    await this.syncLiveState(contracts);

    // Save checkpoint progress
    await db.upsertCheckpoint(indexerName, endLedger + 1);
  }

  private async processEvent(evt: any) {
    const topics: string[] = evt.topic.map((t: any) => {
      try {
        return scValToNative(t).toString();
      } catch {
        return t;
      }
    });

    const eventName = topics[0] || 'Unknown';
    let dataNative: any = {};
    try {
      dataNative = scValToNative(evt.value);
    } catch {
      dataNative = evt.value;
    }

    // LogParsed event to events table
    await db.logEvent({
      contract_id: evt.contractId,
      event_name: eventName,
      topics,
      data: JSON.stringify(dataNative),
      ledger_seq: evt.ledger,
      tx_hash: evt.txHash
    });

    // Idempotent State Updates
    if (eventName === 'Supply' || eventName === 'Withdraw' || eventName === 'Borrow' || eventName === 'Repay') {
      const user = dataNative.user || dataNative.from || dataNative.to;
      const marketId = dataNative.market_id || dataNative.market;
      const amount = Number(dataNative.amount || 0) / 1e7;

      if (user) {
        await db.upsertUser(user);
        
        // Log transaction history
        await db.query(
          `INSERT INTO transactions (user_address, tx_hash, action, market_id, amount, status, ledger, created_at)
           VALUES ($1, $2, $3, $4, $5, 'success', $6, NOW())
           ON CONFLICT (tx_hash) DO NOTHING`,
          [user, evt.txHash, eventName.toLowerCase(), marketId, BigInt(Math.round(amount * 1e7)), evt.ledger]
        );
      }
    } else if (eventName === 'AuctionCreated') {
      await db.upsertAuction({
        id: Number(dataNative.auction_id || dataNative.id || 0),
        user_address: dataNative.borrower || '',
        pool_id: Number(dataNative.pool_id || 0),
        collateral_asset: dataNative.collateral_asset || '',
        collateral_amount: Number(dataNative.collateral_amount || 0) / 1e7,
        debt_asset: dataNative.debt_asset || '',
        debt_amount: Number(dataNative.debt_amount || 0) / 1e7,
        start_ledger: evt.ledger,
        active: true
      });
    } else if (eventName === 'AuctionFilled') {
      const auctionId = Number(dataNative.auction_id || dataNative.id || 0);
      await db.query(`UPDATE auctions SET active = false, updated_at = NOW() WHERE id = $1`, [auctionId]);
    }
  }

  private async syncLiveState(contracts: any) {
    const marketSymbols = ['xlm_shared', 'usdc_shared', 'eurc_shared', 'ergo_satellite'];
    
    for (const mId of marketSymbols) {
      try {
        // Query live core_pool reserves/state if deployed
        const poolContract = new Contract(contracts.corePool);
        
        // Simulate reading market total balance or active supplies
        const statsSim = await server.simulateTransaction({
          fee: '100',
          networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || 'Public Global Stellar Network ; October 2015',
          addOperation: poolContract.call('get_market_state', nativeToScVal(mId, { type: 'symbol' }))
        } as any);

        if (!rpc.Api.isSimulationError(statsSim) && statsSim.result) {
          const state = scValToNative(statsSim.result.retval);
          // Assuming contract returns { total_supplied, total_borrowed, reserve_balance }
          await db.upsertMarket({
            market_id: mId,
            pool_type: mId.includes('satellite') ? 1 : 0,
            asset_address: state.asset || '',
            total_supplied: Number(state.total_supplied || 0) / 1e7,
            total_borrowed: Number(state.total_borrowed || 0) / 1e7,
            reserve_balance: Number(state.reserve_balance || 0) / 1e7
          });
        }
      } catch (err: any) {
        // Suppress print to avoid noise, use standard default placeholders if simulation not configured
      }
    }

    // Aggregate statistics daily
    try {
      const stats = await db.getStats();
      await db.recordDailyMetric({
        tvl: stats.tvl,
        utilization_rate: stats.totalSupplied > 0 ? (stats.totalBorrowed / stats.totalSupplied) * 100 : 0,
        active_users: stats.totalUsers,
        transaction_count: stats.totalTxs,
        treasury_balance: stats.totalReserves
      });
    } catch (e) {
      // Ignored
    }
  }

  // Exponential backoff query helper
  private async queryWithRetry<T>(fn: () => Promise<T>, retries = 5, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (retries <= 0) throw err;
      console.warn(`[Indexer Retry] query failed. Retrying in ${delay}ms...`);
      await sleep(delay);
      return this.queryWithRetry(fn, retries - 1, delay * 2);
    }
  }
}

export const ergoIndexer = new ErgoIndexerService();
