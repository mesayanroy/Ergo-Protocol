#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env, Symbol, symbol_short, token, contract, contractimpl, IntoVal};
use crate::{health_factor, storage, position, emode, flash_loan, errors::Error, market};

#[contract]
pub struct MockOracle;

#[contractimpl]
impl MockOracle {
    pub fn get_price(env: Env, _asset: Symbol) -> i128 {
        env.storage().instance().get(&symbol_short!("price")).unwrap_or(10_000i128) // Default price = $1
    }
    
    pub fn set_price(env: Env, price: i128) {
        env.storage().instance().set(&symbol_short!("price"), &price);
    }
}

#[contract]
pub struct MockCompliance;

#[contractimpl]
impl MockCompliance {
    pub fn check_authorized(env: Env, _market_id: Symbol, user: Address) -> Result<(), u32> {
        let is_ok = env.storage().instance().get::<Address, bool>(&user).unwrap_or(false);
        if is_ok { Ok(()) } else { Err(1) }
    }
    
    pub fn allow_user(env: Env, user: Address, allowed: bool) {
        env.storage().instance().set(&user, &allowed);
    }
}

#[contract]
pub struct FlashLoanReceiver;

#[contractimpl]
impl FlashLoanReceiver {
    pub fn execute_op(env: Env, pool: Address, amount: i128) {
        let token_addr: Address = env.storage().instance().get(&symbol_short!("tok")).unwrap();
        // For standard test, repay principal
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &pool, &amount);
    }

    pub fn set_token(env: Env, token: Address) {
        env.storage().instance().set(&symbol_short!("tok"), &token);
    }
}

fn setup_env(env: &Env) -> (Address, Address, Address, Address) {
    let admin = Address::generate(env);
    storage::set_admin(env, &admin);
    
    let oracle = env.register_contract(None, MockOracle);
    storage::set_dependency(env, symbol_short!("oracle"), oracle.clone());

    let compliance = env.register_contract(None, MockCompliance);
    storage::set_dependency(env, symbol_short!("compliance"), compliance.clone());

    let token_admin = Address::generate(env);
    let token_addr = env.register_stellar_asset_contract(token_admin);

    (admin, oracle, compliance, token_addr)
}

#[test]
fn test_borrow_reverts_if_hf_too_low() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, _oracle, _compliance, token_addr) = setup_env(&env);

    let xl_symbol = symbol_short!("XLM");
    market::create_market(&env, admin, xl_symbol.clone(), 0, token_addr.clone(), 5000, 6000, 0, 100_000).unwrap();

    // Supply 100
    position::supply(&env, Address::generate(&env), xl_symbol.clone(), 100).unwrap();

    let borrower = Address::generate(&env);
    // Mint collateral to borrower
    let token_client = token::StellarAssetClient::new(&env, &token_addr);
    token_client.mint(&borrower, &1000);
    
    position::supply(&env, borrower.clone(), xl_symbol.clone(), 100).unwrap();

    // Borrowing 60 should fail (collateral factor is 50%, so max borrow is 50)
    let res = position::borrow(&env, borrower, xl_symbol, 60);
    assert_eq!(res.unwrap_err(), Error::HealthFactorTooLow);
}

#[test]
fn test_satellite_debt_ceiling_enforced() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, _oracle, _compliance, token_addr) = setup_env(&env);

    let sat_symbol = symbol_short!("SAT");
    // Pool type 1 = Satellite. Ceiling = 100
    market::create_market(&env, admin, sat_symbol.clone(), 1, token_addr.clone(), 5000, 6000, 0, 100).unwrap();

    let borrower = Address::generate(&env);
    let token_client = token::StellarAssetClient::new(&env, &token_addr);
    token_client.mint(&borrower, &1000);
    // Mint to contract to serve borrows
    token_client.mint(&env.current_contract_address(), &1000);

    position::supply(&env, borrower.clone(), sat_symbol.clone(), 500).unwrap();

    // Borrowing 120 should exceed debt ceiling of 100
    let res = position::borrow(&env, borrower, sat_symbol, 120);
    assert_eq!(res.unwrap_err(), Error::DebtCeilingExceeded);
}

#[test]
fn test_compliance_blocks_unauthorized_on_permissioned() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, _oracle, compliance, token_addr) = setup_env(&env);

    let perm_symbol = symbol_short!("RWA");
    // Pool type 2 = Permissioned
    market::create_market(&env, admin, perm_symbol.clone(), 2, token_addr.clone(), 5000, 6000, 0, 1000).unwrap();

    let user = Address::generate(&env);
    let token_client = token::StellarAssetClient::new(&env, &token_addr);
    token_client.mint(&user, &1000);
    token_client.mint(&env.current_contract_address(), &1000);

    position::supply(&env, user.clone(), perm_symbol.clone(), 500).unwrap();

    // User not allowed yet
    let res = position::borrow(&env, user.clone(), perm_symbol.clone(), 50);
    assert_eq!(res.unwrap_err(), Error::Unauthorized);

    // Allow user
    MockComplianceClient::new(&env, &compliance).allow_user(&user, &true);

    // Should now succeed
    position::borrow(&env, user, perm_symbol, 50).unwrap();
}

#[test]
fn test_emode_gives_higher_ltv() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, _oracle, _compliance, token_addr) = setup_env(&env);

    let xl_symbol = symbol_short!("XLM");
    // EMode Category 1
    market::create_market(&env, admin, xl_symbol.clone(), 0, token_addr.clone(), 5000, 6000, 1, 100_000).unwrap();

    let user = Address::generate(&env);
    let config = storage::get_market_config(&env, xl_symbol).unwrap();
    
    // Normal CF is 5000 (50%)
    let normal_cf = emode::get_effective_collateral_factor(&env, &user, &config);
    assert_eq!(normal_cf, 5000);

    // Activate emode by supplying
    position::supply(&env, user.clone(), symbol_short!("XLM"), 100).unwrap();

    // Boosted CF should be 9000 (90%)
    let boosted_cf = emode::get_effective_collateral_factor(&env, &user, &config);
    assert_eq!(boosted_cf, 9000);
}

#[test]
fn test_flash_loan_reverts_if_not_repaid() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, _oracle, _compliance, token_addr) = setup_env(&env);

    let xl_symbol = symbol_short!("XLM");
    let receiver = env.register_contract(None, FlashLoanReceiver);
    FlashLoanReceiverClient::new(&env, &receiver).set_token(&token_addr);

    // Setup market and supply liquidity
    let admin = Address::generate(&env);
    storage::set_admin(&env, &admin);
    market::create_market(&env, admin, xl_symbol.clone(), 0, token_addr.clone(), 5000, 6000, 0, 100_000).unwrap();

    let supplier = Address::generate(&env);
    let token_client = token::StellarAssetClient::new(&env, &token_addr);
    token_client.mint(&supplier, &1000);
    position::supply(&env, supplier, xl_symbol.clone(), 500).unwrap();

    // Receiver has no funds, so it cannot repay (will fail)
    let res = flash_loan::flash_loan(&env, receiver, xl_symbol, 100);
    assert_eq!(res.unwrap_err(), Error::FlashLoanNotRepaid);
}
