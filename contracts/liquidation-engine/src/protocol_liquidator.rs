use soroban_sdk::{token, Address, Env, Symbol, IntoVal};

use crate::errors::Error;
use crate::storage;

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

/// Executes protocol-owned fallback liquidation path after auction timeout.
pub fn run_protocol_liquidator(env: &Env, auction_id: u32) -> Result<(), Error> {
    let mut auction = storage::get_auction(env, auction_id).ok_or(Error::AuctionNotFound)?;
    if !auction.active {
        return Err(Error::AuctionExpired);
    }

    let backstop = storage::get_backstop(env).ok_or(Error::Unsupported)?;
    let core_pool = storage::get_core_pool(env).ok_or(Error::CorePoolNotFound)?;

    let shortfall = auction.debt_amount;
    let col_reward = auction.collateral_amount;

    // 1. Draw shortfall coverage from Backstop pool (transfers base asset to this contract)
    let _: () = env.invoke_contract(
        &backstop,
        &Symbol::new(env, "draw"),
        soroban_sdk::vec![
            env,
            env.current_contract_address().into_val(env),
            auction.pool_id.into_val(env),
            shortfall.into_val(env),
        ],
    );

    // 2. Query market configs to resolve asset addresses
    let col_config: MarketConfig = env.invoke_contract(
        &core_pool,
        &Symbol::new(env, "get_market_config"),
        soroban_sdk::vec![env, auction.collateral_asset.clone().into_val(env)],
    );
    let debt_config: MarketConfig = env.invoke_contract(
        &core_pool,
        &Symbol::new(env, "get_market_config"),
        soroban_sdk::vec![env, auction.debt_asset.clone().into_val(env)],
    );

    // 3. Repay debt token to Core Pool on behalf of borrower and release collateral token to this contract
    let _: () = env.invoke_contract(
        &core_pool,
        &Symbol::new(env, "liquidate_position"),
        soroban_sdk::vec![
            env,
            env.current_contract_address().into_val(env),
            auction.user.clone().into_val(env),
            auction.debt_asset.clone().into_val(env),
            auction.collateral_asset.clone().into_val(env),
            shortfall.into_val(env),
            col_reward.into_val(env),
        ],
    );

    // 4. Send the recovered collateral to Backstop to recoup their drawn funds
    let col_client = token::Client::new(env, &col_config.asset);
    col_client.transfer(&env.current_contract_address(), &backstop, &col_reward);

    // 5. Deactivate auction
    auction.active = false;
    auction.debt_amount = 0;
    auction.collateral_amount = 0;
    storage::set_auction(env, auction_id, &auction);

    env.events().publish(
        (Symbol::new(env, "ProtocolLiquidated"), auction_id),
        shortfall,
    );
    Ok(())
}
