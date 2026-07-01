#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

pub mod auction;
pub mod bad_debt;
pub mod dutch_curve;
pub mod errors;
pub mod fill;
pub mod protocol_liquidator;
pub mod storage;

use crate::errors::Error;
use crate::storage::Auction;

#[contract]
pub struct LiquidationEngineContract;

#[contractimpl]
impl LiquidationEngineContract {
    /// Initializes liquidation engine dependencies and admin.
    pub fn initialize(
        env: Env,
        admin: Address,
        core_pool: Address,
        backstop: Address,
        base_asset: Address,
    ) -> Result<(), Error> {
        if storage::get_admin(&env).is_some() {
            return Err(Error::Unauthorized);
        }
        storage::set_admin(&env, &admin);
        storage::set_core_pool(&env, &core_pool);
        storage::set_backstop(&env, &backstop);
        storage::set_base_asset(&env, &base_asset);
        Ok(())
    }

    /// Creates a liquidation auction for an unhealthy position.
    pub fn create_liquidation_auction(
        env: Env,
        borrower: Address,
        pool_id: u32,
        collateral_asset: Symbol,
        debt_asset: Symbol,
    ) -> Result<u32, Error> {
        auction::create_liquidation_auction(&env, borrower, pool_id, collateral_asset, debt_asset)
    }

    /// Fills liquidation auction directly.
    pub fn fill_auction(env: Env, filler: Address, auction_id: u32, amount: i128) -> Result<(), Error> {
        fill::fill_auction(&env, filler, auction_id, amount)
    }

    /// Fills liquidation auction via flash loan.
    pub fn fill_via_flash_loan(
        env: Env,
        filler: Address,
        auction_id: u32,
        amount: i128,
    ) -> Result<(), Error> {
        fill::fill_via_flash_loan(&env, filler, auction_id, amount)
    }

    /// Runs fallback protocol liquidator.
    pub fn run_protocol_liquidator(env: Env, auction_id: u32) -> Result<(), Error> {
        protocol_liquidator::run_protocol_liquidator(&env, auction_id)
    }

    /// Finalizes bad debt against backstop.
    pub fn finalize_bad_debt(env: Env, auction_id: u32, residual_shortfall: i128) -> Result<(), Error> {
        bad_debt::finalize_bad_debt(&env, auction_id, residual_shortfall)
    }

    /// Queries an active or historical auction state.
    pub fn get_auction(env: Env, auction_id: u32) -> Result<Auction, Error> {
        storage::get_auction(&env, auction_id).ok_or(Error::AuctionNotFound)
    }
}
