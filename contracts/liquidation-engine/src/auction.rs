use soroban_sdk::{Address, Env, Symbol, IntoVal};

use crate::errors::Error;
use crate::storage::{self, Auction};

#[soroban_sdk::contracttype]
#[derive(Clone, Debug)]
pub struct PositionState {
    pub supplied: i128,
    pub borrowed: i128,
    pub delegated: i128,
}

#[soroban_sdk::contracttype]
#[derive(Clone, Debug)]
pub struct MarketConfig {
    pub active: bool,
    pub permissioned: bool,
    pub debt_ceiling: i128,
    pub pool_type: u32,
    pub asset: Address,
    pub collateral_factor: u32,
    pub liquidation_threshold: u32,
    pub emode_category: u32,
    pub total_supplied: i128,
    pub total_borrowed: i128,
}

/// Creates liquidation auction for an unhealthy position.
pub fn create_liquidation_auction(
    env: &Env,
    borrower: Address,
    pool_id: u32,
    collateral_asset: Symbol,
    debt_asset: Symbol,
) -> Result<u32, Error> {
    // 1. Query core pool for health factor using liquidation threshold (true)
    let core_pool = storage::get_core_pool(env).ok_or(Error::CorePoolNotFound)?;
    let hf: i128 = env.invoke_contract(
        &core_pool,
        &Symbol::new(env, "get_user_health_factor"),
        soroban_sdk::vec![env, borrower.clone().into_val(env), true.into_val(env)],
    );
    if hf >= 10_000 {
        return Err(Error::HealthFactorTooHigh);
    }

    // 2. Query core pool user position state for collateral and debt asset markets
    let col_pos: PositionState = env.invoke_contract(
        &core_pool,
        &Symbol::new(env, "get_position"),
        soroban_sdk::vec![env, collateral_asset.clone().into_val(env), borrower.clone().into_val(env)],
    );
    let debt_pos: PositionState = env.invoke_contract(
        &core_pool,
        &Symbol::new(env, "get_position"),
        soroban_sdk::vec![env, debt_asset.clone().into_val(env), borrower.clone().into_val(env)],
    );

    if col_pos.supplied <= 0 || debt_pos.borrowed <= 0 {
        return Err(Error::InvalidAmount);
    }

    // 3. Create a unique auction ID
    let mut count = storage::get_auction_count(env);
    count = count.saturating_add(1);
    storage::set_auction_count(env, count);

    let auction = Auction {
        id: count,
        user: borrower,
        pool_id,
        collateral_asset,
        collateral_amount: col_pos.supplied,
        debt_asset,
        debt_amount: debt_pos.borrowed,
        start_ledger: env.ledger().sequence(),
        active: true,
    };
    storage::set_auction(env, count, &auction);

    env.events().publish((Symbol::new(env, "AuctionCreated"), count), auction.collateral_amount);
    Ok(count)
}
