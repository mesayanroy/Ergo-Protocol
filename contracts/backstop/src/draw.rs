use soroban_sdk::{token, Address, Env};

use crate::errors::Error;
use crate::storage;

/// Draws shortfall coverage from a specific pool by the Liquidation Engine.
///
/// Failure conditions:
/// - Returns `Error::InsufficientFunds` when residual shortfall exceeds pool balance.
/// - Returns `Error::Unauthorized` if caller is not the registered Liquidation Engine.
pub fn draw(env: &Env, liquidation_engine: Address, pool_id: u32, shortfall: i128) -> Result<(), Error> {
    liquidation_engine.require_auth();
    if shortfall <= 0 {
        return Err(Error::InvalidAmount);
    }

    let stored_engine = storage::get_liquidation_engine(env).ok_or(Error::Unauthorized)?;
    if liquidation_engine != stored_engine {
        return Err(Error::Unauthorized);
    }

    let balance = storage::get_pool_balance(env, pool_id);
    if shortfall > balance {
        return Err(Error::InsufficientFunds);
    }

    storage::set_pool_balance(env, pool_id, balance - shortfall);

    // Transfer base asset to liquidation engine
    let base_asset = storage::get_base_asset(env).ok_or(Error::PoolNotFound)?;
    let client = token::Client::new(env, &base_asset);
    client.transfer(&env.current_contract_address(), &liquidation_engine, &shortfall);

    env.events().publish(
        (soroban_sdk::Symbol::new(env, "BackstopDraw"), pool_id),
        shortfall,
    );
    Ok(())
}
