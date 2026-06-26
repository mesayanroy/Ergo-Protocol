use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;

/// Flags market as permissioned under governance control.
pub fn flag_market_permissioned(
    _env: &Env,
    _governance: Address,
    _market_id: Symbol,
    _permissioned: bool,
) -> Result<(), Error> {
    Ok(())
}
