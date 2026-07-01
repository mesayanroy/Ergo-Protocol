use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage::{self, MarketConfig};

/// Creates a new market configuration.
pub fn create_market(
    env: &Env,
    admin: Address,
    market_id: Symbol,
    pool_type: u32,
    asset: Address,
    collateral_factor: u32,
    liquidation_threshold: u32,
    emode_category: u32,
    debt_ceiling: i128,
) -> Result<(), Error> {
    require_admin(env, &admin)?;
    if storage::get_market_config(env, market_id.clone()).is_some() {
        return Err(Error::MarketAlreadyExists);
    }

    storage::set_market_config(
        env,
        market_id.clone(),
        &MarketConfig {
            active: true,
            permissioned: (pool_type == 2),
            debt_ceiling,
            pool_type,
            asset,
            collateral_factor,
            liquidation_threshold,
            emode_category,
            total_supplied: 0,
            total_borrowed: 0,
        },
    );

    let mut markets = storage::get_markets(env);
    markets.push_back(market_id);
    storage::set_markets(env, &markets);

    Ok(())
}

/// Pauses an existing market.
pub fn pause_market(env: &Env, admin: Address, market_id: Symbol) -> Result<(), Error> {
    require_admin(env, &admin)?;
    let mut config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;
    config.active = false;
    storage::set_market_config(env, market_id, &config);
    Ok(())
}

/// Resumes an existing market.
pub fn resume_market(env: &Env, admin: Address, market_id: Symbol) -> Result<(), Error> {
    require_admin(env, &admin)?;
    let mut config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;
    config.active = true;
    storage::set_market_config(env, market_id, &config);
    Ok(())
}

fn require_admin(env: &Env, admin: &Address) -> Result<(), Error> {
    admin.require_auth();
    let stored = storage::get_admin(env).ok_or(Error::Unauthorized)?;
    if &stored != admin {
        return Err(Error::Unauthorized);
    }
    Ok(())
}
