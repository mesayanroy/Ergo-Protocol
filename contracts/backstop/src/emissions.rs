use soroban_sdk::{Address, Env};

use crate::errors::Error;
use crate::storage;

/// Claims emissions into backstop accounting.
pub fn gulp_emissions(_env: &Env, amount: i128) -> Result<(), Error> {
    if amount < 0 {
        return Err(Error::InvalidAmount);
    }
    // Gulping logic for reward accounting
    Ok(())
}

/// Sets allocation policy under governance control.
pub fn set_allocation(env: &Env, pool_id: u32, weight_bps: u32) -> Result<(), Error> {
    if weight_bps > 10_000 {
        return Err(Error::InvalidAmount);
    }

    let governance = storage::get_governance(env).ok_or(Error::Unauthorized)?;
    governance.require_auth();

    storage::set_allocation(env, pool_id, weight_bps);
    Ok(())
}

/// Calculates share percentage of a user in a pool proportional to total deposit.
pub fn calculate_share(env: &Env, pool_id: u32, user: Address) -> Result<i128, Error> {
    let user_balance = storage::get_user_balance(env, pool_id, user);
    let total_balance = storage::get_pool_balance(env, pool_id);
    if total_balance == 0 {
        return Ok(0);
    }
    let share = user_balance.saturating_mul(10_000).saturating_div(total_balance);
    Ok(share)
}
