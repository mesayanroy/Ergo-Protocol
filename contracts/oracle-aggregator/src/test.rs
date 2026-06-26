#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env, Vec};

use crate::aggregate;

#[test]
fn median_rejects_empty() {
    let env = Env::default();
    let prices = Vec::<i128>::new(&env);
    assert!(aggregate::median(prices).is_err());
}

#[test]
fn validate_feeds_accepts_placeholder() {
    let env = Env::default();
    let asset = soroban_sdk::symbol_short!("XLM");
    let feeds = Vec::from_array(&env, [Address::generate(&env)]);
    assert!(aggregate::validate_feeds(&env, asset, feeds).is_ok());
}
