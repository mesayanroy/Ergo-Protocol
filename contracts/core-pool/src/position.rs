use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::health_factor;
use crate::storage;

/// Supplies collateral into a market.
///
/// Failure conditions:
/// - Returns `Error::InvalidAmount` when `amount` is non-positive.
pub fn supply(env: &Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;
    if !config.active {
        return Err(Error::MarketPaused);
    }

    let mut position = storage::get_position(env, market_id.clone(), user.clone());
    position.supplied = position.supplied.saturating_add(amount);
    storage::set_position(env, market_id, user, &position);
    Ok(())
}

/// Withdraws collateral from a market.
///
/// Failure conditions:
/// - Returns `Error::InvalidAmount` when `amount` is non-positive.
pub fn withdraw(env: &Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;
    if !config.active {
        return Err(Error::MarketPaused);
    }

    let mut position = storage::get_position(env, market_id.clone(), user.clone());
    if position.supplied < amount {
        return Err(Error::InsufficientLiquidity);
    }

    let next_collateral = position.supplied - amount;
    let next_hf = health_factor::get_health_factor(next_collateral, position.borrowed)?;
    if position.borrowed > 0 && next_hf < 10_000 {
        return Err(Error::HealthFactorTooLow);
    }

    position.supplied = next_collateral;
    storage::set_position(env, market_id, user, &position);
    Ok(())
}

/// Borrows assets from a market.
///
/// Failure conditions:
/// - Returns `Error::InvalidAmount` when `amount` is non-positive.
/// - Returns `Error::HealthFactorTooLow` when post-borrow health factor is below 1.0.
pub fn borrow(env: &Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;
    if !config.active {
        return Err(Error::MarketPaused);
    }

    let mut position = storage::get_position(env, market_id.clone(), user.clone());
    let next_borrowed = position.borrowed.saturating_add(amount);
    if next_borrowed > config.debt_ceiling {
        return Err(Error::InsufficientLiquidity);
    }

    let next_hf = health_factor::get_health_factor(position.supplied, next_borrowed)?;
    if next_hf < 10_000 {
        return Err(Error::HealthFactorTooLow);
    }

    position.borrowed = next_borrowed;
    storage::set_position(env, market_id, user, &position);
    Ok(())
}

/// Repays borrowed assets in a market.
///
/// Failure conditions:
/// - Returns `Error::InvalidAmount` when `amount` is non-positive.
pub fn repay(env: &Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let mut position = storage::get_position(env, market_id.clone(), user.clone());
    position.borrowed = position.borrowed.saturating_sub(amount);
    storage::set_position(env, market_id, user, &position);
    Ok(())
}
