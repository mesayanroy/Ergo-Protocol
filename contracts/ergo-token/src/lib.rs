#![no_std]

mod errors;
mod storage;
mod admin;
mod token;

use soroban_sdk::{contract, contractimpl, Address, Env, String};
use errors::Error;

#[contract]
pub struct ErgoToken;

#[contractimpl]
impl ErgoToken {
    pub fn initialize(env: Env, admin: Address, decimal: u32, name: String, symbol: String) -> Result<(), Error> {
        if storage::get_admin(&env).is_some() {
            return Err(Error::NotAuthorized);
        }
        storage::set_admin(&env, &admin);
        storage::set_metadata(&env, decimal, &name, &symbol);
        Ok(())
    }

    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        admin::mint(&env, to, amount)
    }

    pub fn burn(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        admin::burn(&env, from, amount)
    }

    pub fn burn_from(env: Env, spender: Address, from: Address, amount: i128) -> Result<(), Error> {
        admin::burn_from(&env, spender, from, amount)
    }

    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        admin::set_admin(&env, new_admin)
    }

    // --- SEP-41 Interface ---
    pub fn balance(env: Env, id: Address) -> i128 {
        storage::get_balance(&env, &id)
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        storage::get_allowance(&env, &from, &spender)
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) -> Result<(), Error> {
        token::approve(&env, from, spender, amount, expiration_ledger)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        token::transfer(&env, from, to, amount)
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        token::transfer_from(&env, spender, from, to, amount)
    }

    pub fn decimals(env: Env) -> u32 {
        let (decimals, _, _) = storage::get_metadata(&env);
        decimals
    }

    pub fn name(env: Env) -> String {
        let (_, name, _) = storage::get_metadata(&env);
        name
    }

    pub fn symbol(env: Env) -> String {
        let (_, _, symbol) = storage::get_metadata(&env);
        symbol
    }

    pub fn total_supply(env: Env) -> i128 {
        storage::get_total_supply(&env)
    }
}
