#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec, IntoVal};

// pub mod credit_delegation;
pub mod emode;
pub mod errors;
// pub mod flash_loan;
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
    pub fn flash_loan(env: Env, _user: Address, _market_id: Symbol, _amount: i128) -> Result<(), Error> {
        Err(Error::Unsupported)
    }

    /// Delegates credit.
    pub fn delegate_credit(
        env: Env,
        _delegator: Address,
        _delegatee: Address,
        _market_id: Symbol,
        _allowance: i128,
    ) -> Result<(), Error> {
        Err(Error::Unsupported)
    }

    /// Returns delegated allowance limit.
    pub fn get_credit_allowance(
        env: Env,
        _market_id: Symbol,
        _delegator: Address,
        _delegatee: Address,
    ) -> Result<i128, Error> {
        Ok(0)
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

    pub fn get_market_stats(env: Env, market_id: Symbol) -> Result<storage::MarketStats, Error> {
        let config = storage::get_market_config(&env, market_id.clone()).ok_or(Error::MarketNotFound)?;
        let total_supplied = config.total_supplied;
        let total_borrowed = config.total_borrowed;
        let available_liquidity = total_supplied.saturating_sub(total_borrowed);
        
        let utilization_rate = if total_supplied > 0 {
            (total_borrowed.saturating_mul(10_000_000)) / total_supplied
        } else {
            0
        };

        let borrow_rate = crate::interest_rate::get_borrow_rate(total_supplied, total_borrowed) as i128;
        let borrow_apy = borrow_rate * 1000;
        let supply_apy = if total_supplied > 0 {
            (borrow_apy * total_borrowed) / total_supplied
        } else {
            0
        };

        let market_type = if config.pool_type == 0 {
            Symbol::new(&env, "SharedCore")
        } else {
            Symbol::new(&env, "Satellite")
        };

        Ok(storage::MarketStats {
            market_id,
            total_supplied,
            total_borrowed,
            available_liquidity,
            utilization_rate,
            supply_apy,
            borrow_apy,
            collateral_factor: config.collateral_factor,
            liability_factor: config.liquidation_threshold,
            paused: !config.active,
            permissioned: config.permissioned,
            market_type,
        })
    }

    pub fn get_all_markets(env: Env) -> Result<Vec<storage::MarketStats>, Error> {
        let markets = storage::get_markets(&env);
        let mut stats_vec = Vec::new(&env);
        for market_id in markets.iter() {
            stats_vec.push_back(Self::get_market_stats(env.clone(), market_id)?);
        }
        Ok(stats_vec)
    }

    pub fn get_user_position(env: Env, user: Address) -> Result<storage::UserPosition, Error> {
        let markets = storage::get_markets(&env);
        let mut user_markets = Vec::new(&env);
        let mut total_supply_usd = 0;
        let mut total_borrow_usd = 0;
        let mut weighted_supply_apy = 0;
        let mut weighted_borrow_apy = 0;
        let mut borrow_capacity_usd = 0;
        let mut positions_used = 0;

        let oracle_addr = storage::get_dependency(&env, Symbol::new(&env, "oracle")).ok_or(Error::Unsupported)?;

        for market_id in markets.iter() {
            let position = storage::get_position(&env, market_id.clone(), user.clone());
            if position.supplied == 0 && position.borrowed == 0 {
                continue;
            }

            positions_used += 1;
            user_markets.push_back(storage::UserMarketPosition {
                market_id: market_id.clone(),
                supplied: position.supplied,
                borrowed: position.borrowed,
            });

            let config = storage::get_market_config(&env, market_id.clone()).ok_or(Error::MarketNotFound)?;
            let price: i128 = match env.try_invoke_contract::<i128, soroban_sdk::Error>(
                &oracle_addr,
                &Symbol::new(&env, "get_price"),
                soroban_sdk::vec![&env, market_id.clone().into_val(&env)],
            ) {
                Ok(Ok(price)) => price,
                _ => 1_0000000,
            };

            let stats = Self::get_market_stats(env.clone(), market_id.clone())?;
            let supplied_usd = (position.supplied * price) / 10_000_000;
            let borrowed_usd = (position.borrowed * price) / 10_000_000;

            total_supply_usd += supplied_usd;
            total_borrow_usd += borrowed_usd;
            weighted_supply_apy += supplied_usd * stats.supply_apy;
            weighted_borrow_apy += borrowed_usd * stats.borrow_apy;

            let cf = config.collateral_factor as i128;
            borrow_capacity_usd += (position.supplied * price * cf) / 100_000_000i128;
        }

        let net_apy = if total_supply_usd > 0 {
            (weighted_supply_apy - weighted_borrow_apy) / total_supply_usd
        } else {
            0
        };

        let hf = health_factor::get_user_health_factor(&env, user, false).unwrap_or(99_9999);

        Ok(storage::UserPosition {
            health_factor: hf,
            borrow_capacity_usd,
            net_apy,
            positions_used,
            markets: user_markets,
        })
    }

    pub fn get_user_debt_with_interest(env: Env, user: Address, market_id: Symbol) -> Result<i128, Error> {
        let position = storage::get_position(&env, market_id, user);
        Ok(position.borrowed)
    }

    pub fn simulate_supply(env: Env, user: Address, market_id: Symbol, amount: i128) -> Result<storage::SimulationResult, Error> {
        let hf_before = health_factor::get_user_health_factor(&env, user.clone(), false).unwrap_or(99_9999);
        let cap_before = Self::get_borrow_capacity_impl(&env, user.clone()).unwrap_or(0);
        let debt_before = Self::get_total_debt_impl(&env, user.clone()).unwrap_or(0);
        let limit_before = if cap_before > 0 { (debt_before * 100) / cap_before } else { 0 };

        let position = storage::get_position(&env, market_id.clone(), user.clone());
        let pos_before = position.supplied;
        let pos_after = pos_before + amount;

        let mut temp_pos = position.clone();
        temp_pos.supplied = pos_after;
        storage::set_position(&env, market_id.clone(), user.clone(), &temp_pos);

        let mut config = storage::get_market_config(&env, market_id.clone()).ok_or(Error::MarketNotFound)?;
        config.total_supplied = config.total_supplied + amount;
        storage::set_market_config(&env, market_id.clone(), &config);

        let hf_after = health_factor::get_user_health_factor(&env, user.clone(), false).unwrap_or(99_9999);
        let cap_after = Self::get_borrow_capacity_impl(&env, user.clone()).unwrap_or(0);
        let debt_after = Self::get_total_debt_impl(&env, user.clone()).unwrap_or(0);
        let limit_after = if cap_after > 0 { (debt_after * 100) / cap_after } else { 0 };

        temp_pos.supplied = pos_before;
        storage::set_position(&env, market_id.clone(), user.clone(), &temp_pos);
        config.total_supplied = config.total_supplied - amount;
        storage::set_market_config(&env, market_id.clone(), &config);

        Ok(storage::SimulationResult {
            hf_before,
            hf_after,
            borrow_capacity_before: cap_before,
            borrow_capacity_after: cap_after,
            borrow_limit_pct_before: limit_before,
            borrow_limit_pct_after: limit_after,
            position_before: pos_before,
            position_after: pos_after,
            gas_estimate: 12_500,
        })
    }

    pub fn simulate_borrow(env: Env, user: Address, market_id: Symbol, amount: i128) -> Result<storage::SimulationResult, Error> {
        let hf_before = health_factor::get_user_health_factor(&env, user.clone(), false).unwrap_or(99_9999);
        let cap_before = Self::get_borrow_capacity_impl(&env, user.clone()).unwrap_or(0);
        let debt_before = Self::get_total_debt_impl(&env, user.clone()).unwrap_or(0);
        let limit_before = if cap_before > 0 { (debt_before * 100) / cap_before } else { 0 };

        let position = storage::get_position(&env, market_id.clone(), user.clone());
        let pos_before = position.borrowed;
        let pos_after = pos_before + amount;

        let mut temp_pos = position.clone();
        temp_pos.borrowed = pos_after;
        storage::set_position(&env, market_id.clone(), user.clone(), &temp_pos);

        let mut config = storage::get_market_config(&env, market_id.clone()).ok_or(Error::MarketNotFound)?;
        config.total_borrowed = config.total_borrowed + amount;
        storage::set_market_config(&env, market_id.clone(), &config);

        let hf_after = health_factor::get_user_health_factor(&env, user.clone(), false).unwrap_or(99_9999);
        let cap_after = Self::get_borrow_capacity_impl(&env, user.clone()).unwrap_or(0);
        let debt_after = Self::get_total_debt_impl(&env, user.clone()).unwrap_or(0);
        let limit_after = if cap_after > 0 { (debt_after * 100) / cap_after } else { 0 };

        temp_pos.borrowed = pos_before;
        storage::set_position(&env, market_id.clone(), user.clone(), &temp_pos);
        config.total_borrowed = config.total_borrowed - amount;
        storage::set_market_config(&env, market_id.clone(), &config);

        Ok(storage::SimulationResult {
            hf_before,
            hf_after,
            borrow_capacity_before: cap_before,
            borrow_capacity_after: cap_after,
            borrow_limit_pct_before: limit_before,
            borrow_limit_pct_after: limit_after,
            position_before: pos_before,
            position_after: pos_after,
            gas_estimate: 14_000,
        })
    }

    pub fn simulate_withdraw(env: Env, user: Address, market_id: Symbol, amount: i128) -> Result<storage::SimulationResult, Error> {
        let hf_before = health_factor::get_user_health_factor(&env, user.clone(), false).unwrap_or(99_9999);
        let cap_before = Self::get_borrow_capacity_impl(&env, user.clone()).unwrap_or(0);
        let debt_before = Self::get_total_debt_impl(&env, user.clone()).unwrap_or(0);
        let limit_before = if cap_before > 0 { (debt_before * 100) / cap_before } else { 0 };

        let position = storage::get_position(&env, market_id.clone(), user.clone());
        let pos_before = position.supplied;
        let pos_after = pos_before.saturating_sub(amount);

        let mut temp_pos = position.clone();
        temp_pos.supplied = pos_after;
        storage::set_position(&env, market_id.clone(), user.clone(), &temp_pos);

        let mut config = storage::get_market_config(&env, market_id.clone()).ok_or(Error::MarketNotFound)?;
        config.total_supplied = config.total_supplied.saturating_sub(amount);
        storage::set_market_config(&env, market_id.clone(), &config);

        let hf_after = health_factor::get_user_health_factor(&env, user.clone(), false).unwrap_or(99_9999);
        let cap_after = Self::get_borrow_capacity_impl(&env, user.clone()).unwrap_or(0);
        let debt_after = Self::get_total_debt_impl(&env, user.clone()).unwrap_or(0);
        let limit_after = if cap_after > 0 { (debt_after * 100) / cap_after } else { 0 };

        temp_pos.supplied = pos_before;
        storage::set_position(&env, market_id.clone(), user.clone(), &temp_pos);
        config.total_supplied = config.total_supplied + amount;
        storage::set_market_config(&env, market_id.clone(), &config);

        Ok(storage::SimulationResult {
            hf_before,
            hf_after,
            borrow_capacity_before: cap_before,
            borrow_capacity_after: cap_after,
            borrow_limit_pct_before: limit_before,
            borrow_limit_pct_after: limit_after,
            position_before: pos_before,
            position_after: pos_after,
            gas_estimate: 15_200,
        })
    }

    pub fn simulate_repay(env: Env, user: Address, market_id: Symbol, amount: i128) -> Result<storage::SimulationResult, Error> {
        let hf_before = health_factor::get_user_health_factor(&env, user.clone(), false).unwrap_or(99_9999);
        let cap_before = Self::get_borrow_capacity_impl(&env, user.clone()).unwrap_or(0);
        let debt_before = Self::get_total_debt_impl(&env, user.clone()).unwrap_or(0);
        let limit_before = if cap_before > 0 { (debt_before * 100) / cap_before } else { 0 };

        let position = storage::get_position(&env, market_id.clone(), user.clone());
        let pos_before = position.borrowed;
        let pos_after = pos_before.saturating_sub(amount);

        let mut temp_pos = position.clone();
        temp_pos.borrowed = pos_after;
        storage::set_position(&env, market_id.clone(), user.clone(), &temp_pos);

        let mut config = storage::get_market_config(&env, market_id.clone()).ok_or(Error::MarketNotFound)?;
        config.total_borrowed = config.total_borrowed.saturating_sub(amount);
        storage::set_market_config(&env, market_id.clone(), &config);

        let hf_after = health_factor::get_user_health_factor(&env, user.clone(), false).unwrap_or(99_9999);
        let cap_after = Self::get_borrow_capacity_impl(&env, user.clone()).unwrap_or(0);
        let debt_after = Self::get_total_debt_impl(&env, user.clone()).unwrap_or(0);
        let limit_after = if cap_after > 0 { (debt_after * 100) / cap_after } else { 0 };

        temp_pos.borrowed = pos_before;
        storage::set_position(&env, market_id.clone(), user.clone(), &temp_pos);
        config.total_borrowed = config.total_borrowed + amount;
        storage::set_market_config(&env, market_id.clone(), &config);

        Ok(storage::SimulationResult {
            hf_before,
            hf_after,
            borrow_capacity_before: cap_before,
            borrow_capacity_after: cap_after,
            borrow_limit_pct_before: limit_before,
            borrow_limit_pct_after: limit_after,
            position_before: pos_before,
            position_after: pos_after,
            gas_estimate: 11_800,
        })
    }

    pub fn get_irm_params(env: Env, market_id: Symbol) -> Result<storage::IRMParams, Error> {
        let _config = storage::get_market_config(&env, market_id).ok_or(Error::MarketNotFound)?;
        Ok(storage::IRMParams {
            base_rate: 200_000,
            slope: 800_000,
            target_utilization: 50_000,
            max_utilization: 95_000,
        })
    }

    pub fn get_current_utilization(env: Env, market_id: Symbol) -> Result<i128, Error> {
        let config = storage::get_market_config(&env, market_id).ok_or(Error::MarketNotFound)?;
        if config.total_supplied == 0 {
            return Ok(0);
        }
        Ok((config.total_borrowed * 10_000_000) / config.total_supplied)
    }

    // Helper functions for inner calculations
    fn get_borrow_capacity_impl(env: &Env, user: Address) -> Result<i128, Error> {
        let markets = storage::get_markets(env);
        let oracle_addr = storage::get_dependency(env, Symbol::new(env, "oracle")).ok_or(Error::Unsupported)?;
        let mut capacity = 0;

        for market_id in markets.iter() {
            let position = storage::get_position(env, market_id.clone(), user.clone());
            if position.supplied == 0 {
                continue;
            }
            let config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;
            let price: i128 = match env.try_invoke_contract::<i128, soroban_sdk::Error>(
                &oracle_addr,
                &Symbol::new(env, "get_price"),
                soroban_sdk::vec![env, market_id.clone().into_val(env)],
            ) {
                Ok(Ok(price)) => price,
                _ => 1_0000000,
            };

            let cf = config.collateral_factor as i128;
            let val = (position.supplied * price * cf) / 100_000_000i128;
            capacity += val;
        }
        Ok(capacity)
    }

    fn get_total_debt_impl(env: &Env, user: Address) -> Result<i128, Error> {
        let markets = storage::get_markets(env);
        let oracle_addr = storage::get_dependency(env, Symbol::new(env, "oracle")).ok_or(Error::Unsupported)?;
        let mut debt = 0;

        for market_id in markets.iter() {
            let position = storage::get_position(env, market_id.clone(), user.clone());
            if position.borrowed == 0 {
                continue;
            }
            let price: i128 = match env.try_invoke_contract::<i128, soroban_sdk::Error>(
                &oracle_addr,
                &Symbol::new(env, "get_price"),
                soroban_sdk::vec![env, market_id.clone().into_val(env)],
            ) {
                Ok(Ok(price)) => price,
                _ => 1_0000000,
            };

            debt += (position.borrowed * price) / 10_000_000;
        }
        Ok(debt)
    }
}
