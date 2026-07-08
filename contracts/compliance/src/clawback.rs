use soroban_sdk::{Address, Env, Symbol, IntoVal};

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

    let stored_issuer = storage::get_issuer(env, market_id.clone()).ok_or(Error::Unauthorized)?;
    if issuer != stored_issuer {
        return Err(Error::Unauthorized);
    }

    // Call Core Pool's compliance_clawback if registered
    if let Some(core_pool) = storage::get_core_pool(env) {
        env.invoke_contract::<()>(
            &core_pool,
            &Symbol::new(env, "compliance_clawback"),
            (env.current_contract_address(), user.clone(), market_id.clone(), amount).into_val(env)
        );
    }

    // Emit compliance clawback event
    env.events().publish((Symbol::new(env, "Clawback"), user), amount);
    Ok(())
}
