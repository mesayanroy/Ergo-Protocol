#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::{deposit, draw, storage};

#[test]
fn deposit_updates_pool_balance() {
    let env = Env::default();
    let user = Address::generate(&env);
    deposit::deposit(&env, user, 7, 100).expect("must deposit");
    assert_eq!(storage::get_pool_balance(&env, 7), 100);
}

#[test]
fn draw_respects_pool_balance() {
    let env = Env::default();
    storage::set_pool_balance(&env, 3, 50);
    let engine = Address::generate(&env);
    assert!(draw::draw(&env, engine, 3, 70).is_err());
}
