use soroban_sdk::{Address, Env, Symbol, IntoVal};

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
    // Normal fill called in flash loan execution path
    fill_auction(env, filler, auction_id, amount)
}
