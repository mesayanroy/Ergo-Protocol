#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env, token};
use crate::{deposit, draw, storage};

#[test]
fn test_draw_isolation_invariant() {
    let env = Env::default();
    env.mock_all_auths();

    let gov = Address::generate(&env);
    let engine = Address::generate(&env);
    
    // Register a mock token
    let token_admin = Address::generate(&env);
    let token_addr = env.register_stellar_asset_contract(token_admin);

    // Initialize storage
    storage::set_governance(&env, &gov);
    storage::set_liquidation_engine(&env, &engine);
    storage::set_base_asset(&env, &token_addr);

    // Pool A (ID 1): balance 1000
    storage::set_pool_balance(&env, 1, 1000);
    // Pool B (ID 2): balance 500
    storage::set_pool_balance(&env, 2, 500);

    // Mint base asset to the contract address so it has funds to transfer out during draw
    let token_client = token::StellarAssetClient::new(&env, &token_addr);
    token_client.mint(&env.current_contract_address(), &1000);

    // Draw 300 from Pool A (ID 1)
    draw::draw(&env, engine.clone(), 1, 300).expect("draw should succeed");

    // Verify isolation invariant:
    // Pool A balance should drop from 1000 to 700
    assert_eq!(storage::get_pool_balance(&env, 1), 700);
    // Pool B balance must remain EXACTLY 500!
    assert_eq!(storage::get_pool_balance(&env, 2), 500);
}
