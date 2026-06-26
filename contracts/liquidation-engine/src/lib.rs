#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env};

pub mod auction;
pub mod bad_debt;
pub mod dutch_curve;
pub mod errors;
pub mod fill;
pub mod protocol_liquidator;

use crate::errors::Error;

#[contract]
pub struct LiquidationEngineContract;

#[contractimpl]
impl LiquidationEngineContract {
    /// Creates a liquidation auction.
    pub fn create_liquidation_auction(env: Env, borrower: Address, debt: i128) -> Result<u64, Error> {
        auction::create_liquidation_auction(&env, borrower, debt)
    }

    /// Fills liquidation auction directly.
    pub fn fill_auction(env: Env, filler: Address, auction_id: u64, amount: i128) -> Result<(), Error> {
        fill::fill_auction(&env, filler, auction_id, amount)
    }

    /// Fills liquidation auction via flash loan.
    pub fn fill_via_flash_loan(
        env: Env,
        filler: Address,
        auction_id: u64,
        amount: i128,
    ) -> Result<(), Error> {
        fill::fill_via_flash_loan(&env, filler, auction_id, amount)
    }

    /// Runs fallback protocol liquidator.
    pub fn run_protocol_liquidator(env: Env, auction_id: u64) -> Result<(), Error> {
        protocol_liquidator::run_protocol_liquidator(&env, auction_id)
    }

    /// Finalizes bad debt against backstop.
    pub fn finalize_bad_debt(env: Env, auction_id: u64, residual_shortfall: i128) -> Result<(), Error> {
        bad_debt::finalize_bad_debt(&env, auction_id, residual_shortfall)
    }
}
