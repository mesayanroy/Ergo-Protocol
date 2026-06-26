use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;

/// Trips circuit breaker for a specific asset.
pub fn trip_circuit_breaker(_env: &Env, _asset: Symbol) -> Result<(), Error> {
    Ok(())
}

/// Confirms an asset pause under governance control.
pub fn confirm_pause(_env: &Env, _governance: Address, _asset: Symbol) -> Result<(), Error> {
    Ok(())
}

/// Overrides paused feeds for an asset under governance control.
pub fn override_with_new_feeds(
    _env: &Env,
    _governance: Address,
    _asset: Symbol,
) -> Result<(), Error> {
    Ok(())
}
