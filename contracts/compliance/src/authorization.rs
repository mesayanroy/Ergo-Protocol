use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;

/// Checks whether user is authorized for permissioned market.
pub fn check_authorized(env: &Env, market_id: Symbol, user: Address) -> Result<(), Error> {
    if storage::is_market_permissioned(env, market_id.clone()) {
        if !storage::is_allowed(env, market_id, user) {
            return Err(Error::Unauthorized);
        }
    }
    Ok(())
}
