use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;

/// Performs issuer-gated clawback for permissioned market positions.
pub fn clawback_position(
    env: &Env,
    issuer: Address,
    market_id: Symbol,
    user: Address,
    amount: i128,
) -> Result<(), Error> {
    issuer.require_auth();
    if amount <= 0 {
        return Err(Error::ClawbackNotAllowed);
    }

    let stored_issuer = storage::get_issuer(env, market_id).ok_or(Error::Unauthorized)?;
    if issuer != stored_issuer {
        return Err(Error::Unauthorized);
    }

    // Emit compliance clawback event
    env.events().publish((Symbol::new(env, "Clawback"), user), amount);
    Ok(())
}
