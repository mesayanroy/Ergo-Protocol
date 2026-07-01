#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

pub mod authorization;
pub mod clawback;
pub mod errors;
pub mod permissioned_market;
pub mod storage;

use crate::errors::Error;

#[contract]
pub struct ComplianceContract;

#[contractimpl]
impl ComplianceContract {
    /// Initializes compliance contract admin.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if storage::get_admin(&env).is_some() {
            return Err(Error::Unauthorized);
        }
        storage::set_admin(&env, &admin);
        Ok(())
    }

    /// Checks account authorization for a permissioned market.
    pub fn check_authorized(env: Env, market_id: Symbol, user: Address) -> Result<(), Error> {
        authorization::check_authorized(&env, market_id, user)
    }

    /// Toggles permissioned mode for a market.
    pub fn flag_market_permissioned(
        env: Env,
        governance: Address,
        market_id: Symbol,
        permissioned: bool,
    ) -> Result<(), Error> {
        permissioned_market::flag_market_permissioned(&env, governance, market_id, permissioned)
    }

    /// Configures allowance status for a user.
    pub fn set_allowed(
        env: Env,
        admin: Address,
        market_id: Symbol,
        user: Address,
        allowed: bool,
    ) -> Result<(), Error> {
        permissioned_market::set_allowed(&env, admin, market_id, user, allowed)
    }

    /// Configures issuer address for a market.
    pub fn set_issuer(
        env: Env,
        admin: Address,
        market_id: Symbol,
        issuer: Address,
    ) -> Result<(), Error> {
        permissioned_market::set_issuer(&env, admin, market_id, issuer)
    }

    /// Claws back a market position under issuer authority.
    pub fn clawback_position(
        env: Env,
        issuer: Address,
        market_id: Symbol,
        user: Address,
        amount: i128,
    ) -> Result<(), Error> {
        clawback::clawback_position(&env, issuer, market_id, user, amount)
    }
}
