use soroban_sdk::{Address, Env};

use crate::errors::Error;

/// Fills an active auction with external capital.
pub fn fill_auction(_env: &Env, _filler: Address, _auction_id: u64, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}

/// Fills an active auction through core-pool flash loan flow.
pub fn fill_via_flash_loan(
    _env: &Env,
    _filler: Address,
    _auction_id: u64,
    amount: i128,
) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}
