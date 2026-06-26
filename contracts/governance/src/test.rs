#![cfg(test)]
extern crate std;

use soroban_sdk::{symbol_short, Env};

use crate::executor;

#[test]
fn executor_rejects_unknown_action() {
    let env = Env::default();
    let action = symbol_short!("ARBT");
    assert!(executor::execute_proposal(&env, action).is_err());
}
