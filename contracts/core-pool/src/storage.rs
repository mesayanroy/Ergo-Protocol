use soroban_sdk::{contracttype, Address, Env, Symbol};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct MarketConfig {
    pub active: bool,
    pub permissioned: bool,
    pub debt_ceiling: i128,
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
