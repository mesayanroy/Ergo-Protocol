#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

pub mod aggregate;
pub mod circuit_breaker;
pub mod errors;
pub mod feeds;

use crate::errors::Error;

#[contract]
pub struct OracleAggregatorContract;

#[contractimpl]
impl OracleAggregatorContract {
    /// Reads the median price for an asset from valid feeds.
    pub fn get_price(env: Env, asset: Symbol) -> Result<i128, Error> {
        aggregate::get_price(&env, asset)
    }

    /// Registers a new feed for an asset.
    pub fn register_feed(env: Env, governance: Address, asset: Symbol, feed: Address) -> Result<(), Error> {
        feeds::register_feed(&env, governance, asset, feed)
    }

    /// Trips the circuit breaker for one asset.
    pub fn trip_circuit_breaker(env: Env, asset: Symbol) -> Result<(), Error> {
        circuit_breaker::trip_circuit_breaker(&env, asset)
    }

    /// Confirms pause state for one asset.
    pub fn confirm_pause(env: Env, governance: Address, asset: Symbol) -> Result<(), Error> {
        circuit_breaker::confirm_pause(&env, governance, asset)
    }

    /// Replaces feeds for one asset after a breaker event.
    pub fn override_with_new_feeds(env: Env, governance: Address, asset: Symbol) -> Result<(), Error> {
        circuit_breaker::override_with_new_feeds(&env, governance, asset)
    }
}
