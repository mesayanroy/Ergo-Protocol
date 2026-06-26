#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

pub mod authorization;
pub mod clawback;
pub mod errors;
pub mod permissioned_market;

use crate::errors::Error;

#[contract]
pub struct ComplianceContract;

#[contractimpl]
impl ComplianceContract {
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
