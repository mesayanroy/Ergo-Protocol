use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage::{self, MarketConfig};

/// Creates a new market configuration.
///
/// Parameters:
/// - `env`: contract environment.
/// - `admin`: governance/admin caller expected to be authorized.
/// - `market_id`: unique market symbol.
///
/// Failure conditions:
/// - Returns `Error::Unauthorized` when caller is not current admin.
pub fn create_market(env: &Env, admin: Address, market_id: Symbol) -> Result<(), Error> {
    require_admin(env, &admin)?;
    if storage::get_market_config(env, market_id.clone()).is_some() {
        return Err(Error::MarketAlreadyExists);
    }

    storage::set_market_config(
        env,
        market_id,
        &MarketConfig {
            active: true,
            permissioned: false,
            debt_ceiling: i128::MAX,
        },
    );
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
    let stored = storage::get_admin(env).ok_or(Error::Unauthorized)?;
    if &stored != admin {
        return Err(Error::Unauthorized);
    }
    Ok(())
}
