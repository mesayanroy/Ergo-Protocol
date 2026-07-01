use soroban_sdk::{token, Address, Env, Symbol};

use crate::errors::Error;
use crate::health_factor;
use crate::storage;

/// Supplies collateral into a market.
pub fn supply(env: &Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
    user.require_auth();
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let mut config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;
    if !config.active {
        return Err(Error::MarketPaused);
    }

    // Transfer asset from user to Core Pool
    let client = token::Client::new(env, &config.asset);
    client.transfer(&user, &env.current_contract_address(), &amount);

    let mut position = storage::get_position(env, market_id.clone(), user.clone());
    position.supplied = position.supplied.saturating_add(amount);
    config.total_supplied = config.total_supplied.saturating_add(amount);

    storage::set_position(env, market_id.clone(), user, &position);
    storage::set_market_config(env, market_id, &config);
    Ok(())
}

/// Withdraws collateral from a market.
pub fn withdraw(env: &Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
    user.require_auth();
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let mut config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;
    if !config.active {
        return Err(Error::MarketPaused);
    }

    let mut position = storage::get_position(env, market_id.clone(), user.clone());
    if position.supplied < amount {
        return Err(Error::InsufficientLiquidity);
    }

    // Temporarily apply withdrawal update to state to verify health factor
    position.supplied = position.supplied - amount;
    storage::set_position(env, market_id.clone(), user.clone(), &position);

    let hf = health_factor::get_user_health_factor(env, user.clone(), false)?;
    if hf < 10_000 {
        // Revert temporary state change
        position.supplied = position.supplied + amount;
        storage::set_position(env, market_id, user, &position);
        return Err(Error::HealthFactorTooLow);
    }

    config.total_supplied = config.total_supplied - amount;
    storage::set_market_config(env, market_id, &config);

    // Transfer asset back to user
    let client = token::Client::new(env, &config.asset);
    client.transfer(&env.current_contract_address(), &user, &amount);
    Ok(())
}

/// Borrows assets from a market.
pub fn borrow(env: &Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
    user.require_auth();
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let mut config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;
    if !config.active {
        return Err(Error::MarketPaused);
    }

    // [1] Check debt ceiling
    let next_borrowed = config.total_borrowed.saturating_add(amount);
    if next_borrowed > config.debt_ceiling {
        return Err(Error::DebtCeilingExceeded);
    }

    // [2] Check compliance for permissioned markets
    if config.permissioned {
        let compliance_addr = storage::get_dependency(env, Symbol::new(env, "compliance")).ok_or(Error::Unsupported)?;
        let authorized: Result<(), Error> = env.invoke_contract(
            &compliance_addr,
            &Symbol::new(env, "check_authorized"),
            soroban_sdk::vec![env, market_id.clone().into_val(env), user.clone().into_val(env)],
        );
        if authorized.is_err() {
            return Err(Error::Unauthorized);
        }
    }

    let mut position = storage::get_position(env, market_id.clone(), user.clone());
    
    // Temporarily apply borrow update to state to verify health factor
    position.borrowed = position.borrowed.saturating_add(amount);
    storage::set_position(env, market_id.clone(), user.clone(), &position);

    let hf = health_factor::get_user_health_factor(env, user.clone(), false)?;
    if hf < 10_000 {
        // Revert temporary state change
        position.borrowed = position.borrowed - amount;
        storage::set_position(env, market_id, user, &position);
        return Err(Error::HealthFactorTooLow);
    }

    config.total_borrowed = next_borrowed;
    storage::set_market_config(env, market_id, &config);

    // Transfer borrowed asset to user
    let client = token::Client::new(env, &config.asset);
    client.transfer(&env.current_contract_address(), &user, &amount);
    Ok(())
}

/// Repays borrowed assets in a market.
pub fn repay(env: &Env, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
    user.require_auth();
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let mut config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;

    let mut position = storage::get_position(env, market_id.clone(), user.clone());
    let repay_amount = if amount > position.borrowed { position.borrowed } else { amount };

    if repay_amount > 0 {
        // Transfer asset from user to Core Pool
        let client = token::Client::new(env, &config.asset);
        client.transfer(&user, &env.current_contract_address(), &repay_amount);

        position.borrowed = position.borrowed - repay_amount;
        config.total_borrowed = config.total_borrowed - repay_amount;

        storage::set_position(env, market_id.clone(), user, &position);
        storage::set_market_config(env, market_id, &config);
    }
    Ok(())
}

/// Claws back a user's position. Callable only by compliance contract.
pub fn compliance_clawback(env: &Env, caller: Address, user: Address, market_id: Symbol, amount: i128) -> Result<(), Error> {
    caller.require_auth();
    let compliance = storage::get_dependency(env, Symbol::new(env, "compliance")).ok_or(Error::Unsupported)?;
    if caller != compliance {
        return Err(Error::Unauthorized);
    }

    let mut position = storage::get_position(env, market_id.clone(), user.clone());
    let mut config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;

    let claw_supplied = if amount > position.supplied { position.supplied } else { amount };
    position.supplied = position.supplied - claw_supplied;
    config.total_supplied = config.total_supplied - claw_supplied;

    storage::set_position(env, market_id.clone(), user, &position);
    storage::set_market_config(env, market_id, &config);
    Ok(())
}

/// Settles a liquidated position. Callable only by the Liquidation Engine.
pub fn liquidate_position(
    env: &Env,
    liquidator: Address,
    borrower: Address,
    debt_market: Symbol,
    collateral_market: Symbol,
    repay_amount: i128,
    collateral_reward: i128,
) -> Result<(), Error> {
    let liquidation_engine = storage::get_dependency(env, Symbol::new(env, "liquidation_engine")).ok_or(Error::Unsupported)?;
    liquidation_engine.require_auth();

    let mut debt_pos = storage::get_position(env, debt_market.clone(), borrower.clone());
    let mut debt_config = storage::get_market_config(env, debt_market.clone()).ok_or(Error::MarketNotFound)?;
    
    let actual_repay = if repay_amount > debt_pos.borrowed { debt_pos.borrowed } else { repay_amount };
    debt_pos.borrowed = debt_pos.borrowed - actual_repay;
    debt_config.total_borrowed = debt_config.total_borrowed - actual_repay;
    storage::set_position(env, debt_market, borrower.clone(), &debt_pos);
    storage::set_market_config(env, debt_market, &debt_config);

    let mut col_pos = storage::get_position(env, collateral_market.clone(), borrower.clone());
    let mut col_config = storage::get_market_config(env, collateral_market.clone()).ok_or(Error::MarketNotFound)?;
    
    let actual_reward = if collateral_reward > col_pos.supplied { col_pos.supplied } else { collateral_reward };
    col_pos.supplied = col_pos.supplied - actual_reward;
    col_config.total_supplied = col_config.total_supplied - actual_reward;
    storage::set_position(env, collateral_market, borrower, &col_pos);
    storage::set_market_config(env, collateral_market, &col_config);

    // Transfer repay_amount of debt token from liquidator to Core Pool
    let debt_client = token::Client::new(env, &debt_config.asset);
    debt_client.transfer(&liquidator, &env.current_contract_address(), &actual_repay);

    // Transfer actual_reward of collateral token from Core Pool to liquidator
    let col_client = token::Client::new(env, &col_config.asset);
    col_client.transfer(&env.current_contract_address(), &liquidator, &actual_reward);

    Ok(())
}
