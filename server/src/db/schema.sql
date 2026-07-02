-- Markets: cached from on-chain Core Pool
CREATE TABLE IF NOT EXISTS markets (
  market_id VARCHAR(64) PRIMARY KEY,
  asset_code VARCHAR(12) NOT NULL,
  asset_issuer VARCHAR(56),
  market_type VARCHAR(20) NOT NULL, -- 'shared_core' | 'satellite' | 'emode'
  collateral_factor DECIMAL(6,4),
  liability_factor DECIMAL(6,4),
  debt_ceiling BIGINT,              -- NULL for shared core
  total_supplied BIGINT DEFAULT 0,
  total_borrowed BIGINT DEFAULT 0,
  supply_apy DECIMAL(8,4),
  borrow_apy DECIMAL(8,4),
  paused BOOLEAN DEFAULT false,
  permissioned BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Positions: user lending/borrowing state
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(56) NOT NULL,
  market_id VARCHAR(64) REFERENCES markets(market_id),
  supplied_balance BIGINT DEFAULT 0,
  borrowed_balance BIGINT DEFAULT 0,
  health_factor DECIMAL(10,4),
  e_mode_active BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_address, market_id)
);

-- Auctions: active and historical liquidation auctions
CREATE TABLE IF NOT EXISTS auctions (
  auction_id BIGINT PRIMARY KEY,
  user_address VARCHAR(56) NOT NULL,
  pool_id VARCHAR(64) NOT NULL,
  collateral_asset VARCHAR(64),
  debt_asset VARCHAR(64),
  collateral_amount BIGINT,
  debt_amount BIGINT,
  start_ledger INT,
  start_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'filled' | 'expired' | 'protocol_filled'
  filler_address VARCHAR(56),
  fill_time TIMESTAMP,
  discount_applied DECIMAL(6,4)
);

-- Proposals: governance history
CREATE TABLE IF NOT EXISTS proposals (
  proposal_id BIGINT PRIMARY KEY,
  proposal_type VARCHAR(64) NOT NULL,
  title TEXT,
  description TEXT,
  proposer VARCHAR(56) NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active'|'passed'|'rejected'|'executed'|'timelock'
  votes_for BIGINT DEFAULT 0,
  votes_against BIGINT DEFAULT 0,
  quorum_reached BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  voting_ends_at TIMESTAMP,
  timelock_until TIMESTAMP,
  executed_at TIMESTAMP
);

-- Price history: oracle feed snapshots
CREATE TABLE IF NOT EXISTS price_snapshots (
  id SERIAL PRIMARY KEY,
  asset_code VARCHAR(12) NOT NULL,
  reflector_price BIGINT,
  twap_price BIGINT,
  median_price BIGINT,
  deviation_bps INT,
  circuit_breaker_tripped BOOLEAN DEFAULT false,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Backstop balances: per-pool insurance fund state
CREATE TABLE IF NOT EXISTS backstop_balances (
  pool_id VARCHAR(64) PRIMARY KEY,
  total_balance BIGINT DEFAULT 0,
  worst_case_shortfall BIGINT DEFAULT 0,
  coverage_ratio DECIMAL(8,4),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions: user action history
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(56) NOT NULL,
  tx_hash VARCHAR(64) UNIQUE,
  action VARCHAR(20) NOT NULL, -- 'supply'|'withdraw'|'borrow'|'repay'|'liquidate'
  market_id VARCHAR(64),
  amount BIGINT,
  asset_code VARCHAR(12),
  status VARCHAR(20) DEFAULT 'success',
  ledger INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Compliance: allowlist for permissioned markets
CREATE TABLE IF NOT EXISTS compliance_allowlist (
  market_id VARCHAR(64) NOT NULL,
  user_address VARCHAR(56) NOT NULL,
  kyc_verified BOOLEAN DEFAULT false,
  authorized_by VARCHAR(56),  -- issuer address that granted access
  authorized_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(market_id, user_address)
);

CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_address);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_asset ON price_snapshots(asset_code, recorded_at DESC);