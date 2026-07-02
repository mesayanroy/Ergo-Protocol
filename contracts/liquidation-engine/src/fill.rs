use soroban_sdk::{token, Address, Env, Symbol, IntoVal};

use crate::errors::Error;
use crate::storage;
use crate::dutch_curve;

/// Fills an active auction with external capital.
pub fn fill_auction(env: &Env, filler: Address, auction_id: u32, amount: i128) -> Result<(), Error> {
    filler.require_auth();
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    let mut auction = storage::get_auction(env, auction_id).ok_or(Error::AuctionNotFound)?;
    if !auction.active {
        return Err(Error::AuctionExpired);
    }

    if amount > auction.debt_amount {
        return Err(Error::InvalidAmount);
    }

    // Calculate discount using dutch curve (max 100 ledgers, max 10% discount)
    let elapsed = env.ledger().sequence().saturating_sub(auction.start_ledger);
    let discount = dutch_curve::discount_bps(elapsed, 100, 1000) as i128;

    // Compute proportional collateral reward
    let proportional_collateral = amount
        .saturating_mul(auction.collateral_amount)
        / auction.debt_amount;
    
    // Apply discount boost: reward = collateral * (1 + discount / 10_000)
    let collateral_reward = proportional_collateral
        .saturating_mul(10_000 + discount)
        / 10_000;

    let col_reward = if collateral_reward > auction.collateral_amount {
        auction.collateral_amount
    } else {
        collateral_reward
    };

    let core_pool = storage::get_core_pool(env).ok_or(Error::CorePoolNotFound)?;

    // Call liquidate_position on Core Pool
    let _: () = env.invoke_contract(
        &core_pool,
        &Symbol::new(env, "liquidate_position"),
        soroban_sdk::vec![
            env,
            filler.clone().into_val(env),
            auction.user.clone().into_val(env),
            auction.debt_asset.clone().into_val(env),
            auction.collateral_asset.clone().into_val(env),
            amount.into_val(env),
            col_reward.into_val(env),
        ],
    );

    // Update auction state
    auction.debt_amount = auction.debt_amount - amount;
    auction.collateral_amount = auction.collateral_amount - col_reward;

    if auction.debt_amount <= 0 || auction.collateral_amount <= 0 {
        auction.active = false;
    }

    storage::set_auction(env, auction_id, &auction);

    env.events().publish(
        (Symbol::new(env, "AuctionFilled"), auction_id, filler),
        amount,
    );
    Ok(())
}

/// Fills an active auction through core-pool flash loan flow.
pub fn fill_via_flash_loan(
    env: &Env,
    filler: Address,
    auction_id: u32,
    amount: i128,
) -> Result<(), Error> {
    let auction = storage::get_auction(env, auction_id).ok_or(Error::AuctionNotFound)?;
    if !auction.active {
        return Err(Error::AuctionExpired);
    }
    
    // Store context for callback
    storage::set_flash_context(env, &storage::FlashContext {
        filler: filler.clone(),
        auction_id,
    });

    let core_pool = storage::get_core_pool(env).ok_or(Error::CorePoolNotFound)?;

    // Invoke flash loan from core pool
    let _: () = env.invoke_contract(
        &core_pool,
        &Symbol::new(env, "flash_loan"),
        soroban_sdk::vec![
            env,
            env.current_contract_address().into_val(env),
            auction.debt_asset.clone().into_val(env),
            amount.into_val(env),
        ],
    );

    Ok(())
}

/// Callback executed by Core Pool during flash loan.
pub fn execute_op(env: &Env, _pool: Address, amount: i128) -> Result<(), Error> {
    let ctx = storage::get_flash_context(env).ok_or(Error::AuctionNotFound)?;
    let auction = storage::get_auction(env, ctx.auction_id).ok_or(Error::AuctionNotFound)?;
    let core_pool = storage::get_core_pool(env).ok_or(Error::CorePoolNotFound)?;

    // Fetch collateral reward before filling to know how much we get
    let elapsed = env.ledger().sequence().saturating_sub(auction.start_ledger);
    let discount = dutch_curve::discount_bps(elapsed, 100, 1000) as i128;
    let proportional_collateral = amount
        .saturating_mul(auction.collateral_amount)
        / auction.debt_amount;
    let collateral_reward = proportional_collateral
        .saturating_mul(10_000 + discount)
        / 10_000;
    let col_reward = if collateral_reward > auction.collateral_amount {
        auction.collateral_amount
    } else {
        collateral_reward
    };

    // Execute the fill using our own contract address as the filler
    fill_auction(env, env.current_contract_address(), ctx.auction_id, amount)?;

    // Fetch asset addresses from core-pool config
    let debt_market_config: crate::auction::MarketConfig = env.invoke_contract(
        &core_pool,
        &Symbol::new(env, "get_market_config"),
        soroban_sdk::vec![env, auction.debt_asset.clone().into_val(env)],
    );

    let col_market_config: crate::auction::MarketConfig = env.invoke_contract(
        &core_pool,
        &Symbol::new(env, "get_market_config"),
        soroban_sdk::vec![env, auction.collateral_asset.clone().into_val(env)],
    );

    // Transfer the claimed collateral from this contract to filler
    let col_client = token::Client::new(env, &col_market_config.asset);
    col_client.transfer(&env.current_contract_address(), &ctx.filler, &col_reward);

    // Pull repay amount of debt token from filler to this contract to settle the flash loan
    let debt_client = token::Client::new(env, &debt_market_config.asset);
    debt_client.transfer(&ctx.filler, &env.current_contract_address(), &amount);

    Ok(())
}
