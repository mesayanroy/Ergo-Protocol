use soroban_sdk::{Address, Env, Symbol, IntoVal};

use crate::errors::Error;
use crate::storage;

/// Finalizes residual bad debt and triggers backstop draw for exact shortfall.
pub fn finalize_bad_debt(env: &Env, auction_id: u32, residual_shortfall: i128) -> Result<(), Error> {
    if residual_shortfall <= 0 {
        return Err(Error::InvalidAmount);
    }
    
    let mut auction = storage::get_auction(env, auction_id).ok_or(Error::AuctionNotFound)?;
    if !auction.active {
        return Err(Error::AuctionExpired);
    }

    let backstop = storage::get_backstop(env).ok_or(Error::Unsupported)?;
    let core_pool = storage::get_core_pool(env).ok_or(Error::CorePoolNotFound)?;

    // Draw from backstop to cover the residual shortfall
    let _: () = env.invoke_contract(
        &backstop,
        &Symbol::new(env, "draw"),
        soroban_sdk::vec![
            env,
            env.current_contract_address().into_val(env),
            auction.pool_id.into_val(env),
            residual_shortfall.into_val(env),
        ],
    );

    // Call Core Pool's liquidate_position with 0 collateral reward to write off debt
    let _: () = env.invoke_contract(
        &core_pool,
        &Symbol::new(env, "liquidate_position"),
        soroban_sdk::vec![
            env,
            env.current_contract_address().into_val(env),
            auction.user.clone().into_val(env),
            auction.debt_asset.clone().into_val(env),
            auction.collateral_asset.clone().into_val(env),
            residual_shortfall.into_val(env),
            0i128.into_val(env),
        ],
    );

    auction.active = false;
    storage::set_auction(env, auction_id, &auction);

    env.events().publish((Symbol::new(env, "BadDebtFinalized"), auction_id), residual_shortfall);
    Ok(())
}
