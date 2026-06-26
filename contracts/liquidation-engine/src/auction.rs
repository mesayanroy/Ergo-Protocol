use soroban_sdk::{Address, Env};

use crate::errors::Error;

/// Creates liquidation auction for an unhealthy position.
pub fn create_liquidation_auction(_env: &Env, _borrower: Address, debt: i128) -> Result<u64, Error> {
    if debt <= 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(1)
}
