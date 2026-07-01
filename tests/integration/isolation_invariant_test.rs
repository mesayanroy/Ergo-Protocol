#![cfg(test)]

use soroban_sdk::{
    contract, contractimpl, token, Address, Env, Symbol, IntoVal
};

// Integration test for Backstop Pool Isolation Invariant
#[test]
fn test_backstop_isolation_invariant() {
    let env = Env::default();
    env.mock_all_auths();

    // 1. Setup administrative accounts
    let admin = Address::generate(&env);
    let depositor_a = Address::generate(&env);
    let depositor_b = Address::generate(&env);
    let mock_engine = Address::generate(&env);

    // 2. Deploy mock base asset (USDC)
    let usdc_id = env.register_stellar_asset_contract(admin.clone());
    let usdc_client = token::StellarAssetContractClient::new(&env, &usdc_id);

    // Mint starting balances: 100 USDC each
    usdc_client.mint(&depositor_a, &100_000_000);
    usdc_client.mint(&depositor_b, &100_000_000);

    // 3. Register and deploy Backstop
    let backstop_id = env.register_contract_wasm(None, backstop::WASM);
    let backstop = backstop::Client::new(&env, &backstop_id);

    // Initialize Backstop
    backstop.initialize(&admin, &mock_engine, &usdc_id);

    // 4. Deposit into Pool 0 (Depositor A)
    let usdc_token = token::Client::new(&env, &usdc_id);
    usdc_token.approve(&depositor_a, &backstop_id, &100_000_000, &9999u32);
    backstop.deposit(&depositor_a, &0u32, &100_000_000);

    // 5. Deposit into Pool 1 (Depositor B)
    usdc_token.approve(&depositor_b, &backstop_id, &100_000_000, &9999u32);
    backstop.deposit(&depositor_b, &1u32, &100_000_000);

    // Verify deposits are recorded separately
    assert_eq!(backstop.get_pool_balance(&0u32), 100_000_000);
    assert_eq!(backstop.get_pool_balance(&1u32), 100_000_000);

    // 6. Attempt to draw more than Pool 0's reserves (e.g. 120 USDC)
    // Even though the aggregate Backstop contract balance is 200 USDC,
    // Pool 0 is isolated and must fail to draw 120 USDC!
    let draw_result = backstop.try_draw(&mock_engine, &0u32, &120_000_000);
    
    assert!(draw_result.is_err());
    
    // Pool 0 balance must remain unchanged at 100 USDC
    assert_eq!(backstop.get_pool_balance(&0u32), 100_000_000);
    // Pool 1 balance must remain unchanged at 100 USDC
    assert_eq!(backstop.get_pool_balance(&1u32), 100_000_000);
}
