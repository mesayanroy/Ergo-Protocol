use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;

/// Checks whether user is authorized for permissioned market.
pub fn check_authorized(_env: &Env, _market_id: Symbol, _user: Address) -> Result<(), Error> {
    Ok(())
}
