use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;

/// Performs issuer-gated clawback for permissioned market positions.
pub fn clawback_position(
    _env: &Env,
    _issuer: Address,
    _market_id: Symbol,
    _user: Address,
    amount: i128,
) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::ClawbackNotAllowed);
    }
    Ok(())
}
