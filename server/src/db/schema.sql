-- PostgreSQL schema for Ergo Protocol caching layer.

CREATE TABLE IF NOT EXISTS prices (
    asset_symbol VARCHAR(32) PRIMARY KEY,
    price NUMERIC NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
    user_address VARCHAR(56),
    market_symbol VARCHAR(32),
    supplied NUMERIC NOT NULL DEFAULT 0,
    borrowed NUMERIC NOT NULL DEFAULT 0,
    delegated NUMERIC NOT NULL DEFAULT 0,
    health_factor NUMERIC NOT NULL DEFAULT 999999,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_address, market_symbol)
);

CREATE TABLE IF NOT EXISTS proposals (
    id BIGINT PRIMARY KEY,
    proposer VARCHAR(56) NOT NULL,
    target_contract VARCHAR(56) NOT NULL,
    action_name VARCHAR(64) NOT NULL,
    votes_for NUMERIC NOT NULL DEFAULT 0,
    votes_against NUMERIC NOT NULL DEFAULT 0,
    end_time BIGINT NOT NULL,
    executed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auctions (
    id BIGINT PRIMARY KEY,
    user_address VARCHAR(56) NOT NULL,
    pool_id INT NOT NULL,
    collateral_asset VARCHAR(32) NOT NULL,
    collateral_amount NUMERIC NOT NULL,
    debt_asset VARCHAR(32) NOT NULL,
    debt_amount NUMERIC NOT NULL,
    start_ledger BIGINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);