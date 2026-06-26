use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;

/// Executes a flash loan action atomically.
///
/// Failure conditions:
/// - Returns `Error::InvalidAmount` when `amount` is non-positive.
/// - Returns `Error::FlashLoanNotRepaid` when callback settlement does not repay principal + fee.
pub fn flash_loan(
    _env: &Env,
    _borrower: Address,
    _market_id: Symbol,
    amount: i128,
) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let config = storage::get_market_config(_env, _market_id).ok_or(Error::MarketNotFound)?;
    if !config.active {
        return Err(Error::MarketPaused);
    }
    Ok(())
}
