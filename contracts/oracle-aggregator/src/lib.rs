#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

pub mod aggregate;
pub mod circuit_breaker;
pub mod errors;
pub mod feeds;
pub mod storage;

use crate::errors::Error;

#[contract]
pub struct OracleAggregatorContract;

#[contractimpl]
impl OracleAggregatorContract {
    /// Initializes core oracle admin and dependency addresses.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if storage::get_admin(&env).is_some() {
            return Err(Error::Unauthorized);
        }
        storage::set_admin(&env, &admin);
        Ok(())
    }

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
    pub fn override_with_new_feeds(env: Env, governance: Address, asset: Symbol, feeds: Vec<Address>) -> Result<(), Error> {
        circuit_breaker::override_with_new_feeds(&env, governance, asset, feeds)
    }

    /// Exposes is_tripped status for an asset.
    pub fn is_tripped(env: Env, asset: Symbol) -> bool {
        storage::is_tripped(&env, asset)
    }

    /// Lists registered feeds for an asset.
    pub fn list_feeds(env: Env, asset: Symbol) -> Vec<Address> {
        feeds::list_feeds(&env, asset)
    }

    /// Gets cached last good price for an asset.
    pub fn get_last_good_price(env: Env, asset: Symbol) -> i128 {
        storage::get_last_good_price(&env, asset)
    }
}
