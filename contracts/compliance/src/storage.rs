use soroban_sdk::{contracttype, Address, Env, Symbol};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Permissioned(Symbol),
    Allowlist(Symbol, Address),
    Issuer(Symbol),
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().persistent().get(&DataKey::Admin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().persistent().set(&DataKey::Admin, admin);
}

pub fn is_market_permissioned(env: &Env, market_id: Symbol) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Permissioned(market_id))
        .unwrap_or(false)
}

pub fn set_market_permissioned(env: &Env, market_id: Symbol, permissioned: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::Permissioned(market_id), &permissioned);
}

pub fn is_allowed(env: &Env, market_id: Symbol, user: Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Allowlist(market_id, user))
        .unwrap_or(false)
}

pub fn set_allowed(env: &Env, market_id: Symbol, user: Address, allowed: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::Allowlist(market_id, user), &allowed);
}

pub fn get_issuer(env: &Env, market_id: Symbol) -> Option<Address> {
    env.storage().persistent().get(&DataKey::Issuer(market_id))
}

pub fn set_issuer(env: &Env, market_id: Symbol, issuer: &Address) {
    env.storage().persistent().set(&DataKey::Issuer(market_id), issuer);
}
