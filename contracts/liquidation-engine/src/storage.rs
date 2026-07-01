use soroban_sdk::{contracttype, Address, Env, Symbol};

#[derive(Clone, Debug)]
#[contracttype]
pub struct Auction {
    pub id: u32,
    pub user: Address,
    pub pool_id: u32,
    pub collateral_asset: Symbol,
    pub collateral_amount: i128,
    pub debt_asset: Symbol,
    pub debt_amount: i128,
    pub start_ledger: u32,
    pub active: bool,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    CorePool,
    Backstop,
    BaseAsset,
    AuctionCount,
    Auction(u32),
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

pub fn set_core_pool(env: &Env, pool: &Address) {
    env.storage().instance().set(&DataKey::CorePool, pool);
}

pub fn get_core_pool(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::CorePool)
}

pub fn set_backstop(env: &Env, backstop: &Address) {
    env.storage().instance().set(&DataKey::Backstop, backstop);
}

pub fn get_backstop(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Backstop)
}

pub fn set_base_asset(env: &Env, asset: &Address) {
    env.storage().instance().set(&DataKey::BaseAsset, asset);
}

pub fn get_base_asset(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::BaseAsset)
}

pub fn get_auction_count(env: &Env) -> u32 {
    env.storage().persistent().get(&DataKey::AuctionCount).unwrap_or(0)
}

pub fn set_auction_count(env: &Env, count: u32) {
    env.storage().persistent().set(&DataKey::AuctionCount, &count);
}

pub fn set_auction(env: &Env, id: u32, auction: &Auction) {
    env.storage().persistent().set(&DataKey::Auction(id), auction);
}

pub fn get_auction(env: &Env, id: u32) -> Option<Auction> {
    env.storage().persistent().get(&DataKey::Auction(id))
}
