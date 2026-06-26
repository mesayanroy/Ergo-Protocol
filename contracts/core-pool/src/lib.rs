#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

pub mod credit_delegation;
pub mod errors;
pub mod flash_loan;
pub mod health_factor;
pub mod interest_rate;
pub mod market;
pub mod position;
pub mod storage;

use crate::errors::Error;

#[contract]
pub struct CorePoolContract;

#[contractimpl]
impl CorePoolContract {
    /// Initializes core pool admin and dependency addresses.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        storage::set_admin(&env, &admin);
        Ok(())
    }

    /// Creates a market configuration.
    pub fn create_market(env: Env, admin: Address, market_id: Symbol) -> Result<(), Error> {
        market::create_market(&env, admin, market_id)
    }

    /// Pauses a market.
    pub fn pause_market(env: Env, admin: Address, market_id: Symbol) -> Result<(), Error> {
        market::pause_market(&env, admin, market_id)
    }

    /// Resumes a market.
    pub fn resume_market(env: Env, admin: Address, market_id: Symbol) -> Result<(), Error> {
        market::resume_market(&env, admin, market_id)
    }

    /// Supplies assets to a market.
    pub fn supply(env: Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
        position::supply(&env, user, market_id, amount)
    }

    /// Withdraws assets from a market.
    pub fn withdraw(env: Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
        position::withdraw(&env, user, market_id, amount)
    }

    /// Borrows assets from a market.
    pub fn borrow(env: Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
        position::borrow(&env, user, market_id, amount)
    }

    /// Repays assets to a market.
    pub fn repay(env: Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
        position::repay(&env, user, market_id, amount)
    }

    /// Executes a flash loan.
    pub fn flash_loan(env: Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
        flash_loan::flash_loan(&env, user, market_id, amount)
    }

    /// Delegates credit.
    pub fn delegate_credit(
        env: Env,
        delegator: Address,
        delegatee: Address,
        market_id: Symbol,
        allowance: i128,
    ) -> Result<(), Error> {
        credit_delegation::delegate_credit(&env, delegator, delegatee, market_id, allowance)
    }

    /// Returns the health factor for an account position.
    pub fn get_health_factor(collateral_value: i128, debt_value: i128) -> Result<i128, Error> {
        health_factor::get_health_factor(collateral_value, debt_value)
    }
}
