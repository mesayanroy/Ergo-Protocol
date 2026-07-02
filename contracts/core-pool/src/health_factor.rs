use soroban_sdk::{Address, Env, Symbol, IntoVal};

use crate::errors::Error;
use crate::storage;

/// Returns the health factor for a user based on dynamic oracle prices and market rules.
pub fn get_user_health_factor(
    env: &Env,
    user: Address,
    use_liquidation_threshold: bool,
) -> Result<i128, Error> {
    let markets = storage::get_markets(env);
    let oracle_addr = storage::get_dependency(env, Symbol::new(env, "oracle")).ok_or(Error::Unsupported)?;

    let mut total_collateral_value: i128 = 0;
    let mut total_debt_value: i128 = 0;

    for market_id in markets.iter() {
        let position = storage::get_position(env, market_id.clone(), user.clone());
        if position.supplied == 0 && position.borrowed == 0 {
            continue;
        }

        let config = storage::get_market_config(env, market_id.clone()).ok_or(Error::MarketNotFound)?;
        
        // Invoke oracle contract to fetch latest price
        let price: i128 = match env.try_invoke_contract::<i128>(
            &oracle_addr,
            &Symbol::new(env, "get_price"),
            soroban_sdk::vec![env, market_id.clone().into_val(env)],
        ) {
            Ok(price) => price,
            Err(_) => return Err(Error::OracleCircuitBreakerActive),
        };

        if price <= 0 {
            return Err(Error::OracleCircuitBreakerActive);
        }

        if position.supplied > 0 {
            // Apply collateral factor or liquidation threshold
            let factor = if use_liquidation_threshold {
                config.liquidation_threshold as i128
            } else {
                crate::emode::get_effective_collateral_factor(env, &user, &config) as i128
            };
            // value = amount * price * factor / 10_000
            let value = position.supplied
                .saturating_mul(price)
                .saturating_mul(factor)
                / 10_000;
            total_collateral_value = total_collateral_value.saturating_add(value);
        }

        if position.borrowed > 0 {
            let value = position.borrowed.saturating_mul(price);
            total_debt_value = total_debt_value.saturating_add(value);
        }
    }

    if total_debt_value == 0 {
        return Ok(i128::MAX); // Safe from liquidation
    }

    // Health factor = total_collateral_value * 10_000 / total_debt_value
    let hf = total_collateral_value.saturating_mul(10_000) / total_debt_value;
    Ok(hf)
}

/// Helper function to get health factor from pre-calculated collateral and debt values.
pub fn get_health_factor(collateral_value: i128, debt_value: i128) -> Result<i128, Error> {
    if debt_value < 0 {
        return Err(Error::InvalidAmount);
    }
    if debt_value == 0 {
        return Ok(i128::MAX);
    }
    Ok(collateral_value.saturating_mul(10_000) / debt_value)
}
