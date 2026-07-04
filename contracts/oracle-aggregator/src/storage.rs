use soroban_sdk::{contracttype, Address, Env, Symbol, Vec};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Feeds(Symbol),
    Breaker(Symbol),
    Admin,
    LastGoodPrice(Symbol),
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().persistent().get(&DataKey::Admin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().persistent().set(&DataKey::Admin, admin);
}

pub fn get_feeds(env: &Env, asset: Symbol) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::Feeds(asset))
        .unwrap_or_else(|| Vec::new(env))
}

pub fn set_feeds(env: &Env, asset: Symbol, feeds: &Vec<Address>) {
    env.storage().persistent().set(&DataKey::Feeds(asset), feeds);
}

pub fn is_tripped(env: &Env, asset: Symbol) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Breaker(asset))
        .unwrap_or(false)
}

pub fn set_tripped(env: &Env, asset: Symbol, tripped: bool) {
    env.storage().persistent().set(&DataKey::Breaker(asset), &tripped);
}

pub fn get_last_good_price(env: &Env, asset: Symbol) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::LastGoodPrice(asset))
        .unwrap_or(0)
}

pub fn set_last_good_price(env: &Env, asset: Symbol, price: i128) {
    env.storage().persistent().set(&DataKey::LastGoodPrice(asset), &price);
}
