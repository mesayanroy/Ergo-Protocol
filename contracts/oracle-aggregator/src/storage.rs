use soroban_sdk::{contracttype, Address, Env, Symbol, Vec};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct FeedSample {
    pub feed: Address,
    pub price: i128,
    pub updated_ledger: u32,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Feeds(Symbol),
    Breaker(Symbol),
}

pub fn get_feeds(env: &Env, asset: Symbol) -> Vec<FeedSample> {
    env.storage()
        .persistent()
        .get(&DataKey::Feeds(asset))
        .unwrap_or_else(|_| Vec::new(env))
}

pub fn set_feeds(env: &Env, asset: Symbol, feeds: &Vec<FeedSample>) {
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
