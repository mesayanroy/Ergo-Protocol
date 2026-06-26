use soroban_sdk::{Address, Env};

use crate::errors::Error;
use crate::storage;

/// Draws shortfall coverage from a specific pool.
///
/// Failure conditions:
/// - Returns `Error::InsufficientFunds` when residual shortfall exceeds pool balance.
pub fn draw(env: &Env, _liquidation_engine: Address, pool_id: u32, shortfall: i128) -> Result<(), Error> {
    if shortfall <= 0 {
        return Err(Error::InvalidAmount);
    }
    let balance = storage::get_pool_balance(env, pool_id);
    if shortfall > balance {
        return Err(Error::InsufficientFunds);
    }
    storage::set_pool_balance(env, pool_id, balance - shortfall);
    Ok(())
}
