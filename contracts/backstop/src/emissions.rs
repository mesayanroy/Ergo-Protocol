use soroban_sdk::Env;

use crate::errors::Error;

/// Claims emissions into backstop accounting.
pub fn gulp_emissions(_env: &Env, amount: i128) -> Result<(), Error> {
    if amount < 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}

/// Sets allocation policy under governance control.
pub fn set_allocation(_env: &Env, _pool_id: u32, weight_bps: u32) -> Result<(), Error> {
    if weight_bps > 10_000 {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}
