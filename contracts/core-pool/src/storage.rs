use soroban_sdk::{contracttype, Address, Env, Symbol, Vec};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct MarketConfig {
    pub active: bool,
    pub permissioned: bool,
    pub debt_ceiling: i128,          // i128::MAX represents no ceiling
    pub pool_type: u32,              // 0 = SharedCore, 1 = Satellite, 2 = Permissioned
    pub asset: Address,              // Token asset contract address
    pub collateral_factor: u32,      // basis points (e.g. 7500 for 75%)
    pub liquidation_threshold: u32,  // basis points (e.g. 8000 for 80%)
    pub emode_category: u32,         // 0 = default, 1 = correlated
    pub total_supplied: i128,
    pub total_borrowed: i128,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct PositionState {
    pub supplied: i128,
    pub borrowed: i128,
    pub delegated: i128,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Market(Symbol),
    Position(Symbol, Address),
    Dependency(Symbol),
    CreditAllowance(Symbol, Address, Address), // (market_id, delegator, delegatee)
    MarketsList,
}

pub fn get_markets(env: &Env) -> Vec<Symbol> {
    env.storage()
        .persistent()
        .get(&DataKey::MarketsList)
        .unwrap_or_else(|| Vec::new(env))
}

pub fn set_markets(env: &Env, markets: &Vec<Symbol>) {
    env.storage().persistent().set(&DataKey::MarketsList, markets);
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

pub fn set_dependency(env: &Env, name: Symbol, address: Address) {
    env.storage().instance().set(&DataKey::Dependency(name), &address);
}

pub fn get_dependency(env: &Env, name: Symbol) -> Option<Address> {
    env.storage().instance().get(&DataKey::Dependency(name))
}

pub fn set_market_config(env: &Env, market_id: Symbol, config: &MarketConfig) {
    env.storage().persistent().set(&DataKey::Market(market_id), config);
}

pub fn get_market_config(env: &Env, market_id: Symbol) -> Option<MarketConfig> {
    env.storage().persistent().get(&DataKey::Market(market_id))
}

pub fn set_position(env: &Env, market_id: Symbol, user: Address, state: &PositionState) {
    env.storage().persistent().set(&DataKey::Position(market_id, user), state);
}

pub fn get_position(env: &Env, market_id: Symbol, user: Address) -> PositionState {
    env.storage()
        .persistent()
        .get(&DataKey::Position(market_id, user))
        .unwrap_or(PositionState {
            supplied: 0,
            borrowed: 0,
            delegated: 0,
        })
}

pub fn set_credit_allowance(env: &Env, market_id: Symbol, delegator: Address, delegatee: Address, amount: i128) {
    env.storage()
        .persistent()
        .set(&DataKey::CreditAllowance(market_id, delegator, delegatee), &amount);
}

pub fn get_credit_allowance(env: &Env, market_id: Symbol, delegator: Address, delegatee: Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::CreditAllowance(market_id, delegator, delegatee))
        .unwrap_or(0)
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct MarketStats {
    pub market_id: Symbol,
    pub total_supplied: i128,
    pub total_borrowed: i128,
    pub available_liquidity: i128,
    pub utilization_rate: i128,
    pub supply_apy: i128,
    pub borrow_apy: i128,
    pub collateral_factor: u32,
    pub liability_factor: u32,
    pub paused: bool,
    pub permissioned: bool,
    pub market_type: Symbol,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct UserMarketPosition {
    pub market_id: Symbol,
    pub supplied: i128,
    pub borrowed: i128,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct UserPosition {
    pub health_factor: i128,
    pub borrow_capacity_usd: i128,
    pub net_apy: i128,
    pub positions_used: u32,
    pub markets: Vec<UserMarketPosition>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct SimulationResult {
    pub hf_before: i128,
    pub hf_after: i128,
    pub borrow_capacity_before: i128,
    pub borrow_capacity_after: i128,
    pub borrow_limit_pct_before: i128,
    pub borrow_limit_pct_after: i128,
    pub position_before: i128,
    pub position_after: i128,
    pub gas_estimate: i128,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct IRMParams {
    pub base_rate: i128,
    pub slope: i128,
    pub target_utilization: i128,
    pub max_utilization: i128,
}
