#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

pub mod credit_delegation;
pub mod emode;
pub mod errors;
pub mod flash_loan;
pub mod health_factor;
pub mod interest_rate;
pub mod market;
pub mod position;
pub mod storage;

use crate::errors::Error;
use crate::storage::PositionState;

#[contract]
pub struct CorePoolContract;

#[contractimpl]
impl CorePoolContract {
    /// Initializes core pool admin and dependency addresses.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if storage::get_admin(&env).is_some() {
            return Err(Error::Unauthorized);
        }
        storage::set_admin(&env, &admin);
        Ok(())
    }

    /// Sets dependency address.
    pub fn set_dependency(env: Env, admin: Address, name: Symbol, address: Address) -> Result<(), Error> {
        admin.require_auth();
        let stored_admin = storage::get_admin(&env).ok_or(Error::Unauthorized)?;
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        storage::set_dependency(&env, name, address);
        Ok(())
    }

    /// Gets dependency address.
    pub fn get_dependency(env: Env, name: Symbol) -> Result<Address, Error> {
        storage::get_dependency(&env, name).ok_or(Error::Unsupported)
    }

    /// Creates a market configuration.
    pub fn create_market(
        env: Env,
        admin: Address,
        market_id: Symbol,
        pool_type: u32,
        asset: Address,
        collateral_factor: u32,
        liquidation_threshold: u32,
        emode_category: u32,
        debt_ceiling: i128,
    ) -> Result<(), Error> {
        market::create_market(
            &env,
            admin,
            market_id,
            pool_type,
            asset,
            collateral_factor,
            liquidation_threshold,
            emode_category,
            debt_ceiling,
        )
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

    /// Settles a liquidated position. Callable only by the Liquidation Engine.
    pub fn liquidate_position(
        env: Env,
        liquidator: Address,
        borrower: Address,
        debt_market: Symbol,
        collateral_market: Symbol,
        repay_amount: i128,
        collateral_reward: i128,
    ) -> Result<(), Error> {
        position::liquidate_position(
            &env,
            liquidator,
            borrower,
            debt_market,
            collateral_market,
            repay_amount,
            collateral_reward,
        )
    }

    /// Claws back a position under compliance directive.
    pub fn compliance_clawback(env: Env, caller: Address, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
        position::compliance_clawback(&env, caller, user, market_id, amount)
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

    /// Returns delegated allowance limit.
    pub fn get_credit_allowance(
        env: Env,
        market_id: Symbol,
        delegator: Address,
        delegatee: Address,
    ) -> Result<i128, Error> {
        Ok(credit_delegation::get_credit_allowance(&env, market_id, delegator, delegatee))
    }

    /// Returns the position state for a user in a market.
    pub fn get_position(env: Env, market_id: Symbol, user: Address) -> Result<PositionState, Error> {
        Ok(storage::get_position(&env, market_id, user))
    }

    /// Returns the active health factor for an account position based on oracle prices.
    pub fn get_user_health_factor(env: Env, user: Address, use_liquidation_threshold: bool) -> Result<i128, Error> {
        health_factor::get_user_health_factor(&env, user, use_liquidation_threshold)
    }

    /// Pure helper returning health factor represented in basis points where 10_000 equals 1.0.
    pub fn get_health_factor(collateral_value: i128, debt_value: i128) -> Result<i128, Error> {
        health_factor::get_health_factor(collateral_value, debt_value)
    }
}
