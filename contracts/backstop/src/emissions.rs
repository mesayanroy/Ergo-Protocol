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
