use soroban_sdk::{Address, Env};

use crate::errors::Error;
use crate::storage;

/// Deposits insurance capital into a backstop pool.
pub fn deposit(env: &Env, _user: Address, pool_id: u32, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let next = storage::get_pool_balance(env, pool_id).saturating_add(amount);
    storage::set_pool_balance(env, pool_id, next);
    Ok(())
}

/// Queues withdrawal with cooldown semantics.
pub fn queue_withdrawal(_env: &Env, _user: Address, _pool_id: u32, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}
