use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;

/// Delegates borrowing power from delegator to delegatee in a market.
///
/// Failure conditions:
/// - Returns `Error::InvalidAmount` when `allowance` is non-positive.
pub fn delegate_credit(
    _env: &Env,
    _delegator: Address,
    _delegatee: Address,
    _market_id: Symbol,
    allowance: i128,
) -> Result<(), Error> {
    if allowance <= 0 {
        return Err(Error::InvalidAmount);
    }
    let mut position = storage::get_position(_env, _market_id.clone(), _delegator.clone());
    position.delegated = allowance;
    storage::set_position(_env, _market_id, _delegator, &position);
    Ok(())
}
