#![cfg(test)]

use soroban_sdk::{
    contract, contractimpl, token, Address, Env, Symbol, IntoVal
};

// Mock Price Feed Contract
#[contract]
pub struct MockPriceFeed;

#[contractimpl]
impl MockPriceFeed {
    pub fn set_price(env: Env, price: i128) {
        env.storage().persistent().set(&Symbol::new(&env, "price"), &price);
    }
    
    pub fn last_price(env: Env, _asset: Symbol) -> (i128, u64) {
        let price = env.storage().persistent().get(&Symbol::new(&env, "price")).unwrap_or(10_000_000);
        (price, env.ledger().timestamp())
    }
}

// Integration test for the full lending & liquidation flow
#[test]
fn test_full_protocol_flow() {
    let env = Env::default();
    env.mock_all_auths();

    // 1. Setup administrative accounts
    let admin = Address::generate(&env);
    let borrower = Address::generate(&env);
    let backstop_depositor = Address::generate(&env);
    let liquidator = Address::generate(&env);

    // 2. Deploy mock assets (USDC and XLM)
    let usdc_id = env.register_stellar_asset_contract(admin.clone());
    let xlm_id = env.register_stellar_asset_contract(admin.clone());

    let usdc_client = token::StellarAssetContractClient::new(&env, &usdc_id);
    let xlm_client = token::StellarAssetContractClient::new(&env, &xlm_id);

    // Mint starting balances
    usdc_client.mint(&borrower, &1_000_000_000);
    usdc_client.mint(&backstop_depositor, &500_000_000);
    usdc_client.mint(&liquidator, &2_000_000_000);
    xlm_client.mint(&borrower, &2_000_000_000);

    // 3. Deploy Mock Price Feeds
    let feed_usdc_id = env.register_contract(None, MockPriceFeed);
    let feed_xlm_id = env.register_contract(None, MockPriceFeed);
    
    let feed_usdc = MockPriceFeedClient::new(&env, &feed_usdc_id);
    let feed_xlm = MockPriceFeedClient::new(&env, &feed_xlm_id);

    // Set initial prices: USDC = 1.0 (10,000,000), XLM = 0.5 (5,000,000)
    feed_usdc.set_price(&10_000_000);
    feed_xlm.set_price(&5_000_000);

    // 4. Register and deploy Ergo contracts
    let core_pool_id = env.register_contract_wasm(None, core_pool::WASM);
    let oracle_id = env.register_contract_wasm(None, oracle_aggregator::WASM);
    let backstop_id = env.register_contract_wasm(None, backstop::WASM);
    let compliance_id = env.register_contract_wasm(None, compliance::WASM);
    let liquidation_id = env.register_contract_wasm(None, liquidation_engine::WASM);
    let governance_id = env.register_contract_wasm(None, governance::WASM);

    let core_pool = core_pool::Client::new(&env, &core_pool_id);
    let oracle = oracle_aggregator::Client::new(&env, &oracle_id);
    let backstop = backstop::Client::new(&env, &backstop_id);
    let compliance = compliance::Client::new(&env, &compliance_id);
    let liquidation = liquidation_engine::Client::new(&env, &liquidation_id);
    let governance = governance::Client::new(&env, &governance_id);

    // 5. Initialize contracts
    core_pool.initialize(&admin);
    oracle.initialize(&admin);
    backstop.initialize(&admin, &liquidation_id, &usdc_id);
    compliance.initialize(&admin);
    liquidation.initialize(&admin, &core_pool_id, &backstop_id, &usdc_id);
    governance.initialize(&admin);

    // Set core pool dependencies
    core_pool.set_dependency(&admin, &Symbol::new(&env, "oracle"), &oracle_id);
    core_pool.set_dependency(&admin, &Symbol::new(&env, "backstop"), &backstop_id);
    core_pool.set_dependency(&admin, &Symbol::new(&env, "compliance"), &compliance_id);
    core_pool.set_dependency(&admin, &Symbol::new(&env, "liquidation_engine"), &liquidation_id);

    // 6. Register feeds with Oracle Aggregator
    let usdc_symbol = Symbol::new(&env, "USDC");
    let xlm_symbol = Symbol::new(&env, "XLM");
    oracle.register_feed(&admin, &usdc_symbol, &feed_usdc_id);
    oracle.register_feed(&admin, &xlm_symbol, &feed_xlm_id);

    // 7. Create Core Pool markets
    core_pool.create_market(&admin, &usdc_symbol, &0u32, &usdc_id, &7500u32, &8000u32, &1u32, &i128::MAX);
    core_pool.create_market(&admin, &xlm_symbol, &0u32, &xlm_id, &6000u32, &7000u32, &1u32, &i128::MAX);

    // 8. Deposit capital into Backstop (USDC pool)
    let backstop_usdc = token::Client::new(&env, &usdc_id);
    backstop_usdc.approve(&backstop_depositor, &backstop_id, &500_000_000, &9999u32);
    backstop.deposit(&backstop_depositor, &0u32, &500_000_000);

    // 9. Supply collateral and Borrow
    let xlm_token_client = token::Client::new(&env, &xlm_id);
    xlm_token_client.approve(&borrower, &core_pool_id, &1_000_000_000, &9999u32);
    core_pool.supply(&borrower, &xlm_symbol, &1_000_000_000);

    // Borrow USDC against XLM collateral
    core_pool.borrow(&borrower, &usdc_symbol, &400_000_000);

    // 10. Simulate price crash: XLM price drops from 0.5 (5,000,000) to 0.1 (1,000,000)
    feed_xlm.set_price(&1_000_000);

    // 11. Create liquidation auction
    let auction_id = liquidation.create_liquidation_auction(&borrower, &0u32, &xlm_symbol, &usdc_symbol);

    // Approve liquidation engine to pull debt tokens from liquidator
    let usdc_token_client = token::Client::new(&env, &usdc_id);
    usdc_token_client.approve(&liquidator, &core_pool_id, &400_000_000, &9999u32);

    // 12. Fill the auction
    liquidation.fill_auction(&liquidator, &auction_id, &400_000_000);

    // 13. Verify auction became inactive and borrower debt is paid off
    let auction = liquidation.get_auction(&auction_id).unwrap();
    assert!(!auction.active);
    
    let position = core_pool.get_position(&usdc_symbol, &borrower).unwrap();
    assert_eq!(position.borrowed, 0);
}
