#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env, Symbol, symbol_short, token, contract, contractimpl, IntoVal};
use crate::{dutch_curve, storage, fill, bad_debt, protocol_liquidator, errors::Error};

#[soroban_sdk::contracttype]
#[derive(Clone, Debug)]
pub struct PositionState {
    pub supplied: i128,
    pub borrowed: i128,
    pub delegated: i128,
}

#[soroban_sdk::contracttype]
#[derive(Clone, Debug)]
pub struct MarketConfig {
    pub active: bool,
    pub permissioned: bool,
    pub debt_ceiling: i128,
    pub pool_type: u32,
    pub asset: Address,
    pub collateral_factor: u32,
    pub liquidation_threshold: u32,
    pub emode_category: u32,
    pub total_supplied: i128,
    pub total_borrowed: i128,
}

#[contract]
pub struct MockCorePool;

#[contractimpl]
impl MockCorePool {
    pub fn get_user_health_factor(env: Env, _user: Address, _use_lt: bool) -> i128 {
        9_000 // Unhealthy
    }

    pub fn get_position(env: Env, _market: Symbol, _user: Address) -> PositionState {
        PositionState { supplied: 1000, borrowed: 500, delegated: 0 }
    }

    pub fn get_market_config(env: Env, _market: Symbol) -> MarketConfig {
        let asset = env.storage().instance().get(&symbol_short!("asset")).unwrap_or_else(|| Address::generate(&env));
        MarketConfig {
            active: true,
            permissioned: false,
            debt_ceiling: 10_000,
            pool_type: 0,
            asset,
            collateral_factor: 5000,
            liquidation_threshold: 6000,
            emode_category: 0,
            total_supplied: 1000,
            total_borrowed: 500,
        }
    }

    pub fn set_asset(env: Env, asset: Address) {
        env.storage().instance().set(&symbol_short!("asset"), &asset);
    }

    pub fn liquidate_position(
        _env: Env,
        _liquidator: Address,
        _borrower: Address,
        _debt_mkt: Symbol,
        _col_mkt: Symbol,
        _repay: i128,
        _reward: i128,
    ) {
        // Mock success
    }

    pub fn flash_loan(env: Env, receiver: Address, _market: Symbol, amount: i128) {
        // Trigger callback on receiver
        let _: () = env.invoke_contract(
            &receiver,
            &Symbol::new(&env, "execute_op"),
            soroban_sdk::vec![
                &env,
                env.current_contract_address().into_val(&env),
                amount.into_val(&env)
            ],
        );
    }
}

#[contract]
pub struct MockBackstop;

#[contractimpl]
impl MockBackstop {
    pub fn draw(env: Env, _engine: Address, pool_id: u32, shortfall: i128) {
        env.storage().instance().set(&symbol_short!("drawn"), &true);
        env.storage().instance().set(&symbol_short!("pool"), &pool_id);
        env.storage().instance().set(&symbol_short!("amt"), &shortfall);
    }
}

#[contract]
pub struct MockToken;

#[contractimpl]
impl MockToken {
    pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {
        // Mock transfer success
    }
    
    pub fn balance(_env: Env, _user: Address) -> i128 {
        100_000
    }
}

fn setup_env(env: &Env) -> (Address, Address, Address) {
    let admin = Address::generate(env);
    storage::set_admin(env, &admin);

    let core_pool = env.register_contract(None, MockCorePool);
    storage::set_core_pool(env, &core_pool);

    let backstop = env.register_contract(None, MockBackstop);
    storage::set_backstop(env, &backstop);

    let token_addr = env.register_contract(None, MockToken);
    MockCorePoolClient::new(env, &core_pool).set_asset(&token_addr);

    (admin, core_pool, backstop)
}

#[test]
fn test_discount_curve_respects_upper_bound() {
    let discount = dutch_curve::discount_bps(200, 100, 3_000);
    assert_eq!(discount, 3_000);
}

#[test]
fn test_fill_via_flash_loan_with_zero_pre_capital() {
    let env = Env::default();
    env.mock_all_auths();
    
    // Register our contract as receiver of callback
    let engine_addr = env.register_contract(None, crate::LiquidationEngineContract);
    let engine_client = crate::LiquidationEngineContractClient::new(&env, &engine_addr);

    let core_pool = env.register_contract(None, MockCorePool);
    let backstop = env.register_contract(None, MockBackstop);
    let token_addr = env.register_contract(None, MockToken);
    MockCorePoolClient::new(&env, &core_pool).set_asset(&token_addr);

    // Initialize the engine contract instance
    let admin = Address::generate(&env);
    engine_client.initialize(&admin, &core_pool, &backstop, &token_addr);

    // Setup an active auction in storage inside the engine
    let borrower = Address::generate(&env);
    let filler = Address::generate(&env);
    
    // Mock the auction creation
    let auction_id = engine_client.create_liquidation_auction(&borrower, &7, &symbol_short!("XLM"), &symbol_short!("USDC"));

    // Fill via flash loan: filler should not need pre-capital on the engine, the engine manages it atomically
    engine_client.fill_via_flash_loan(&filler, &auction_id, &100);

    let auction = engine_client.get_auction(&auction_id).unwrap();
    assert!(!auction.active); // Filled successfully
}

#[test]
fn test_protocol_fallback_fills_with_zero_external_bots() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, _core_pool, _backstop) = setup_env(&env);

    let borrower = Address::generate(&env);
    let auction_id = crate::auction::create_liquidation_auction(
        &env, borrower, 4, symbol_short!("XLM"), symbol_short!("USDC")
    ).unwrap();

    // Advance ledgers beyond auction window to allow protocol liquidator fallback
    env.ledger().set_sequence(200);

    protocol_liquidator::run_protocol_liquidator(&env, auction_id).unwrap();

    let auction = storage::get_auction(&env, auction_id).unwrap();
    assert!(!auction.active); // Auction should be finalized by protocol reserves
}

#[test]
fn test_bad_debt_draws_from_correct_pool_id() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, _core, backstop) = setup_env(&env);

    let borrower = Address::generate(&env);
    let pool_id = 9u32;
    let auction_id = crate::auction::create_liquidation_auction(
        &env, borrower, pool_id, symbol_short!("XLM"), symbol_short!("USDC")
    ).unwrap();

    // Settle bad debt of 250 units
    bad_debt::finalize_bad_debt(&env, auction_id, 250).unwrap();

    // Verify backstop mock received correct pool_id and amount
    let is_drawn: bool = env.storage().instance().get(&symbol_short!("drawn")).unwrap_or(false);
    let drawn_pool: u32 = env.storage().instance().get(&symbol_short!("pool")).unwrap();
    let drawn_amt: i128 = env.storage().instance().get(&symbol_short!("amt")).unwrap();

    assert!(is_drawn);
    assert_eq!(drawn_pool, pool_id);
    assert_eq!(drawn_amt, 250);
}
