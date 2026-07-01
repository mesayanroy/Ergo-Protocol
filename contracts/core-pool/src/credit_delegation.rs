use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;

/// Delegates borrowing power from delegator to delegatee in a market.
///
/// Failure conditions:
/// - Returns `Error::InvalidAmount` when `allowance` is negative.
pub fn delegate_credit(
    env: &Env,
    delegator: Address,
    delegatee: Address,
    market_id: Symbol,
    allowance: i128,
) -> Result<(), Error> {
    delegator.require_auth();
    if allowance < 0 {
        return Err(Error::InvalidAmount);
    }
    
    storage::set_credit_allowance(env, market_id, delegator, delegatee, allowance);
    Ok(())
}

/// Returns the remaining delegated credit limit between delegator and delegatee.
pub fn get_credit_allowance(
    env: &Env,
    market_id: Symbol,
    delegator: Address,
    delegatee: Address,
) -> i128 {
    storage::get_credit_allowance(env, market_id, delegator, delegatee)
}
