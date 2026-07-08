#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, symbol_short, Address, Env};
use crate::{authorization, permissioned_market, storage, errors::Error};

#[test]
fn test_permissionless_market_always_authorized() {
    let env = Env::default();
    let market = symbol_short!("MKT");
    let user = Address::generate(&env);

    // If market is not flagged as permissioned, authorization check must succeed
    assert!(authorization::check_authorized(&env, market, user).is_ok());
}

#[test]
fn test_permissioned_market_blocks_unauthorized() {
    let env = Env::default();
    let market = symbol_short!("MKT");
    let user = Address::generate(&env);

    // Set market permissioned
    storage::set_market_permissioned(&env, market.clone(), true);

    // Check authorization: should fail since user is not in allowlist
    assert_eq!(
        authorization::check_authorized(&env, market, user).unwrap_err(),
        Error::Unauthorized
    );
}

#[test]
fn test_permissioned_market_allows_allowlisted() {
    let env = Env::default();
    env.mock_all_auths();

    let market = symbol_short!("MKT");
    let user = Address::generate(&env);
    let issuer = Address::generate(&env);

    // Configure storage
    storage::set_market_permissioned(&env, market.clone(), true);
    storage::set_issuer(&env, market.clone(), &issuer);

    // Add user to allowlist under issuer authorization
    permissioned_market::add_to_allowlist(&env, issuer.clone(), market.clone(), user.clone(), true).expect("should succeed");

    // Check authorization: should now succeed
    assert!(authorization::check_authorized(&env, market, user).is_ok());
}
