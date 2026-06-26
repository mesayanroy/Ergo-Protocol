#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env};

pub mod deposit;
pub mod draw;
pub mod emissions;
pub mod errors;
pub mod storage;

use crate::errors::Error;

#[contract]
pub struct BackstopContract;

#[contractimpl]
impl BackstopContract {
    /// Deposits capital into pool backstop.
    pub fn deposit(env: Env, user: Address, pool_id: u32, amount: i128) -> Result<(), Error> {
        deposit::deposit(&env, user, pool_id, amount)
    }

    /// Queues a withdrawal with cooldown.
    pub fn queue_withdrawal(env: Env, user: Address, pool_id: u32, amount: i128) -> Result<(), Error> {
        deposit::queue_withdrawal(&env, user, pool_id, amount)
    }

    /// Draws from a specific pool by liquidation engine.
    pub fn draw(env: Env, liquidation_engine: Address, pool_id: u32, shortfall: i128) -> Result<(), Error> {
        draw::draw(&env, liquidation_engine, pool_id, shortfall)
    }

    /// Pulls emissions into accounting.
    pub fn gulp_emissions(env: Env, amount: i128) -> Result<(), Error> {
        emissions::gulp_emissions(&env, amount)
    }

    /// Sets governance-defined allocation weight.
    pub fn set_allocation(env: Env, pool_id: u32, weight_bps: u32) -> Result<(), Error> {
        emissions::set_allocation(&env, pool_id, weight_bps)
    }
}
