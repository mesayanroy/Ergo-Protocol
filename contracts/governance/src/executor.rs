use soroban_sdk::{Env, Symbol};

use crate::errors::Error;

/// Executes only pre-whitelisted proposal actions.
pub fn execute_proposal(_env: &Env, action: Symbol) -> Result<(), Error> {
    let allowed = [
        soroban_sdk::symbol_short!("PAUSE"),
        soroban_sdk::symbol_short!("ORACL"),
        soroban_sdk::symbol_short!("BSTOP"),
        soroban_sdk::symbol_short!("COMPL"),
        soroban_sdk::symbol_short!("RISK"),
    ];

    if allowed.contains(&action) {
        return Ok(());
    }

    Err(Error::InvalidAction)
}
