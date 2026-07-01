use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;

/// Flags market as permissioned under governance control.
pub fn flag_market_permissioned(
    env: &Env,
    governance: Address,
    market_id: Symbol,
    permissioned: bool,
) -> Result<(), Error> {
    governance.require_auth();
    let admin = storage::get_admin(env).ok_or(Error::Unauthorized)?;
    if governance != admin {
        return Err(Error::Unauthorized);
    }
    storage::set_market_permissioned(env, market_id, permissioned);
    Ok(())
}

/// Sets user allowlist status under governance/admin control.
pub fn set_allowed(
    env: &Env,
    admin: Address,
    market_id: Symbol,
    user: Address,
    allowed: bool,
) -> Result<(), Error> {
    admin.require_auth();
    let stored_admin = storage::get_admin(env).ok_or(Error::Unauthorized)?;
    if admin != stored_admin {
        return Err(Error::Unauthorized);
    }
    storage::set_allowed(env, market_id, user, allowed);
    Ok(())
}

/// Sets issuer address for a market under governance/admin control.
pub fn set_issuer(
    env: &Env,
    admin: Address,
    market_id: Symbol,
    issuer: Address,
) -> Result<(), Error> {
    admin.require_auth();
    let stored_admin = storage::get_admin(env).ok_or(Error::Unauthorized)?;
    if admin != stored_admin {
        return Err(Error::Unauthorized);
    }
    storage::set_issuer(env, market_id, &issuer);
    Ok(())
}
