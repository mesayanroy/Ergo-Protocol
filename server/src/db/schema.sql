-- Prices: cached oracle feed prices
CREATE TABLE IF NOT EXISTS prices (
  asset_symbol VARCHAR(12) PRIMARY KEY,
  price DECIMAL(18,8) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Positions: user lending, borrowing, and credit delegation state
CREATE TABLE IF NOT EXISTS positions (
  user_address VARCHAR(56) NOT NULL,
  market_symbol VARCHAR(64) NOT NULL,
  supplied DECIMAL(20,8) DEFAULT 0,
  borrowed DECIMAL(20,8) DEFAULT 0,
  delegated DECIMAL(20,8) DEFAULT 0,
  health_factor DECIMAL(10,4) DEFAULT 1.0,
  e_mode_active BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_address, market_symbol)
);

-- Auctions: active and historical liquidation auctions
CREATE TABLE IF NOT EXISTS auctions (
  id BIGINT PRIMARY KEY,
  user_address VARCHAR(56) NOT NULL,
  pool_id INT NOT NULL,
  collateral_asset VARCHAR(64),
  collateral_amount DECIMAL(20,8),
  debt_asset VARCHAR(64),
  debt_amount DECIMAL(20,8),
  start_ledger INT,
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
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
  created_at TIMESTAMP DEFAULT NOW(),
  voting_ends_at TIMESTAMP,
  timelock_until TIMESTAMP,
  executed_at TIMESTAMP
);

-- Price snapshots: historical price logs
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
  PRIMARY KEY (market_id, user_address)
);

-- Indexes for performance optimizations
CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_address);
CREATE INDEX IF NOT EXISTS idx_auctions_active ON auctions(active);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_asset ON price_snapshots(asset_code, recorded_at DESC);