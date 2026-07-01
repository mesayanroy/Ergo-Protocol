use soroban_sdk::{Address, Env, Symbol, Vec};

use crate::errors::Error;
use crate::storage;

/// Trips circuit breaker for a specific asset.
pub fn trip_circuit_breaker(env: &Env, asset: Symbol) -> Result<(), Error> {
    storage::set_tripped(env, asset, true);
    Ok(())
}

/// Confirms an asset pause under governance control.
pub fn confirm_pause(env: &Env, governance: Address, asset: Symbol) -> Result<(), Error> {
    governance.require_auth();
    let admin = storage::get_admin(env).ok_or(Error::Unauthorized)?;
    if governance != admin {
        return Err(Error::Unauthorized);
    }
    storage::set_tripped(env, asset, true);
    Ok(())
}

/// Overrides paused feeds for an asset under governance control and resets the tripped status.
pub fn override_with_new_feeds(
    env: &Env,
    governance: Address,
    asset: Symbol,
    feeds: Vec<Address>,
) -> Result<(), Error> {
    governance.require_auth();
    let admin = storage::get_admin(env).ok_or(Error::Unauthorized)?;
    if governance != admin {
        return Err(Error::Unauthorized);
    }
    storage::set_feeds(env, asset.clone(), &feeds);
    storage::set_tripped(env, asset, false);
    Ok(())
}
