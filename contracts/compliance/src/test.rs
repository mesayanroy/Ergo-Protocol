#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, symbol_short, Address, Env};

use crate::clawback;

#[test]
fn clawback_rejects_zero_amount() {
    let env = Env::default();
    let issuer = Address::generate(&env);
    let user = Address::generate(&env);
    assert!(clawback::clawback_position(&env, issuer, symbol_short!("MKT"), user, 0).is_err());
}
