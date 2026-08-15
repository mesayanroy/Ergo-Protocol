import { rpc, Contract, Account, Networks, TransactionBuilder, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { db } from '../db/index.js';

const rpcUrl = process.env.SOROBAN_RPC_URL || 'https://mainnet.sorobanrpc.com';
const server = new rpc.Server(rpcUrl);

const indexerName = 'ergo_indexer';

// Soroban RPC getEvents limits: at most 5 filters per request, 5 contract ids per filter.
const MAX_CONTRACT_IDS_PER_FILTER = 5;
const MAX_FILTERS_PER_REQUEST = 5;

// Ledger window and pagination sizing per polling cycle
const LEDGER_SPAN = 50;
const EVENT_PAGE_SIZE = 100;
const MAX_PAGES_PER_BATCH = 10;

// How far back to start when there is no checkpoint yet (RPC only retains ~24h of events)
const DEFAULT_LOOKBACK_LEDGERS = 100;

// Dummy source account for read-only simulations
const dummyAccount = new Account('GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', '0');

const networkPassphrase =
  process.env.STELLAR_NETWORK_PASSPHRASE ||
  (process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET);

// Helper sleep function
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// JSON-RPC codes that signal a malformed request — retrying them never succeeds.
const NON_RETRYABLE_RPC_CODES = new Set([-32600, -32601, -32602, -32700]);
const NON_RETRYABLE_MESSAGE = /maximum|invalid|must be|malformed|unsupported|not supported|too many|out of range/i;

// RPC rejects a startLedger that has fallen outside its retention window.
const OUT_OF_RETENTION_MESSAGE = /oldest ledger|startledger|start ledger|ledger.*(not found|out of range)/i;

function errorMessage(err: any): string {
  return String(err?.message || err?.error?.message || err || '');
}

function isRetryable(err: any): boolean {
  const code = err?.code ?? err?.error?.code;
  if (typeof code === 'number' && NON_RETRYABLE_RPC_CODES.has(code)) return false;
  return !NON_RETRYABLE_MESSAGE.test(errorMessage(err));
}

function isOutOfRetention(err: any): boolean {
  return OUT_OF_RETENTION_MESSAGE.test(errorMessage(err));
}

/**
 * Groups contract ids into getEvents filters, respecting the RPC's
 * "5 contract ids per filter / 5 filters per request" limits.
 */
function buildEventFilters(contractIds: string[]): any[] {
  const capacity = MAX_CONTRACT_IDS_PER_FILTER * MAX_FILTERS_PER_REQUEST;
  const ids = contractIds.slice(0, capacity);
  if (contractIds.length > capacity) {
    console.warn(
      `[Indexer] ${contractIds.length} contracts configured but RPC allows at most ${capacity}; ignoring the rest.`
    );
  }

  const filters: any[] = [];
  for (let i = 0; i < ids.length; i += MAX_CONTRACT_IDS_PER_FILTER) {
    filters.push({
      type: 'contract',
      contractIds: ids.slice(i, i + MAX_CONTRACT_IDS_PER_FILTER)
    });
  }
  return filters;
}

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
        console.error('❌ Indexer loop execution error:', errorMessage(err));
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

    const latestLedgerRes = await this.queryWithRetry(() => server.getLatestLedger());
    const latestLedger = latestLedgerRes.sequence;

    // Determine starting ledger sequence
    let startLedger = await db.getCheckpoint(indexerName);
    if (!startLedger) {
      startLedger = latestLedger - DEFAULT_LOOKBACK_LEDGERS;
    }

    if (startLedger >= latestLedger) {
      return;
    }

    const endLedger = Math.min(startLedger + LEDGER_SPAN, latestLedger);
    console.log(`[Indexer] Fetching events from ledger ${startLedger} to ${endLedger}...`);

    const filters = buildEventFilters(Object.values(contracts).filter(Boolean) as string[]);
    if (filters.length === 0) {
      return;
    }

    let batch: { events: any[]; complete: boolean };
    try {
      batch = await this.fetchEvents(startLedger, endLedger, filters);
    } catch (err: any) {
      if (isOutOfRetention(err)) {
        // Checkpoint fell out of the RPC's event retention window — skip ahead to what is available.
        const resumeLedger = latestLedger - DEFAULT_LOOKBACK_LEDGERS;
        console.warn(
          `[Indexer] Ledger ${startLedger} is outside the RPC retention window; resuming at ${resumeLedger}.`
        );
        await db.upsertCheckpoint(indexerName, resumeLedger);
        return;
      }
      throw err;
    }

    let lastLedgerSeen = startLedger;
    for (const evt of batch.events) {
      try {
        await this.processEvent(evt);
        lastLedgerSeen = Math.max(lastLedgerSeen, Number(evt.ledger));
      } catch (err: any) {
        console.error(`Failed to process event ${evt.id}:`, errorMessage(err));
      }
    }

    // Sync live contract state for active markets to PostgreSQL
    await this.syncLiveState(contracts);

    // Save checkpoint progress. If the window was truncated, resume from the last ledger
    // actually seen so the remainder is picked up on the next cycle.
    await db.upsertCheckpoint(indexerName, batch.complete ? endLedger + 1 : lastLedgerSeen);
  }

  /**
   * Pages through getEvents for the given ledger window. A single request is capped
   * at EVENT_PAGE_SIZE events, so a busy window needs the cursor to be followed.
   * `complete` is false when the window held more events than the page budget allows.
   */
  private async fetchEvents(
    startLedger: number,
    endLedger: number,
    filters: any[]
  ): Promise<{ events: any[]; complete: boolean }> {
    const collected: any[] = [];
    let cursor: string | undefined;
    let complete = false;

    for (let page = 0; page < MAX_PAGES_PER_BATCH; page++) {
      // The RPC rejects requests that mix a cursor with a ledger range: the cursor
      // already encodes the position, so later pages are bounded client-side instead.
      const request: any = cursor
        ? { filters, limit: EVENT_PAGE_SIZE, cursor }
        : { filters, startLedger, endLedger, limit: EVENT_PAGE_SIZE };

      const response: any = await this.queryWithRetry(() => server.getEvents(request));
      const pageEvents: any[] = response.events || [];

      const inWindow = pageEvents.filter(e => Number(e.ledger) <= endLedger);
      collected.push(...inWindow);

      // Stop once the page is short (window exhausted) or ran past the window
      if (pageEvents.length < EVENT_PAGE_SIZE || inWindow.length < pageEvents.length) {
        complete = true;
        break;
      }

      cursor = response.cursor || pageEvents[pageEvents.length - 1]?.id;
      if (!cursor) {
        complete = true;
        break;
      }

      if (page === MAX_PAGES_PER_BATCH - 1) {
        console.warn(`[Indexer] Page limit reached for ledgers ${startLedger}-${endLedger}; remaining events deferred.`);
      }
    }

    return { events: collected, complete };
  }

  private async processEvent(evt: any) {
    const topics: string[] = (evt.topic || []).map((t: any) => {
      try {
        return String(scValToNative(t));
      } catch {
        return String(t);
      }
    });

    const eventName = topics[0] || 'Unknown';
    let dataNative: any = {};
    try {
      dataNative = scValToNative(evt.value);
    } catch {
      dataNative = evt.value;
    }

    // LogParsed event to events table.
    // SDK v16 hands back a Contract instance here, not a strkey string.
    const contractId = typeof evt.contractId === 'string' ? evt.contractId : evt.contractId?.toString() || '';

    await db.logEvent({
      event_id: evt.id,
      contract_id: contractId,
      event_name: eventName,
      topics,
      data: JSON.stringify(dataNative, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
      ledger_seq: Number(evt.ledger),
      tx_hash: evt.txHash
    });

    // Idempotent State Updates
    if (eventName === 'Supply' || eventName === 'Withdraw' || eventName === 'Borrow' || eventName === 'Repay') {
      const user = dataNative.user || dataNative.from || dataNative.to;
      const marketId = dataNative.market_id || dataNative.market;
      const amountStroops = this.toStroops(dataNative.amount);

      if (user) {
        await db.upsertUser(user);

        // Log transaction history
        await db.query(
          `INSERT INTO transactions (user_address, tx_hash, action, market_id, amount, status, ledger, created_at)
           VALUES ($1, $2, $3, $4, $5, 'success', $6, NOW())
           ON CONFLICT (tx_hash) DO NOTHING`,
          [user, evt.txHash, eventName.toLowerCase(), marketId, amountStroops, Number(evt.ledger)]
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
        start_ledger: Number(evt.ledger),
        active: true
      });
    } else if (eventName === 'AuctionFilled') {
      const auctionId = Number(dataNative.auction_id || dataNative.id || 0);
      await db.query(`UPDATE auctions SET active = false, updated_at = NOW() WHERE id = $1`, [auctionId]);
    }
  }

  /** i128 amounts arrive as bigint; keep full precision instead of round-tripping through Number. */
  private toStroops(amount: any): bigint {
    try {
      if (typeof amount === 'bigint') return amount;
      if (typeof amount === 'string') return BigInt(amount);
      if (typeof amount === 'number') return BigInt(Math.round(amount));
      return 0n;
    } catch {
      return 0n;
    }
  }

  private async syncLiveState(contracts: any) {
    const marketSymbols = ['xlm_shared', 'usdc_shared', 'eurc_shared', 'ergo_satellite'];

    for (const mId of marketSymbols) {
      try {
        // Query live core_pool reserves/state if deployed
        const poolContract = new Contract(contracts.corePool);
        const op = poolContract.call('get_market_state', nativeToScVal(mId, { type: 'symbol' }));
        const tx = new TransactionBuilder(dummyAccount, { fee: '100', networkPassphrase })
          .addOperation(op)
          .setTimeout(0)
          .build();

        const statsSim = await server.simulateTransaction(tx);

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

  // Exponential backoff query helper — only transient failures are retried.
  private async queryWithRetry<T>(fn: () => Promise<T>, retries = 5, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (retries <= 0 || !isRetryable(err)) throw err;
      console.warn(`[Indexer Retry] query failed (${errorMessage(err)}). Retrying in ${delay}ms...`);
      await sleep(delay);
      return this.queryWithRetry(fn, retries - 1, delay * 2);
    }
  }
}

export const ergoIndexer = new ErgoIndexerService();
