use soroban_sdk::{contracttype, Address, Env};

#[derive(Clone)]
#[contracttype]
pub struct WithdrawalRequest {
    pub amount: i128,
    pub unlock_timestamp: u64,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Governance,
    PoolBalance(u32),
    PendingWithdrawal(u32, Address),
    LiquidationEngine,
    BaseAsset,
    Allocation(u32),
    UserBalance(u32, Address),
}

pub fn set_user_balance(env: &Env, pool_id: u32, user: Address, amount: i128) {
    env.storage().persistent().set(&DataKey::UserBalance(pool_id, user), &amount);
}

pub fn get_user_balance(env: &Env, pool_id: u32, user: Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::UserBalance(pool_id, user))
        .unwrap_or(0)
}

pub fn set_governance(env: &Env, gov: &Address) {
    env.storage().persistent().set(&DataKey::Governance, gov);
}

pub fn get_governance(env: &Env) -> Option<Address> {
    env.storage().persistent().get(&DataKey::Governance)
}

pub fn set_liquidation_engine(env: &Env, engine: &Address) {
    env.storage().persistent().set(&DataKey::LiquidationEngine, engine);
}

pub fn get_liquidation_engine(env: &Env) -> Option<Address> {
    env.storage().persistent().get(&DataKey::LiquidationEngine)
}

pub fn set_base_asset(env: &Env, asset: &Address) {
    env.storage().persistent().set(&DataKey::BaseAsset, asset);
}

pub fn get_base_asset(env: &Env) -> Option<Address> {
    env.storage().persistent().get(&DataKey::BaseAsset)
}

pub fn set_pool_balance(env: &Env, pool_id: u32, amount: i128) {
    env.storage().persistent().set(&DataKey::PoolBalance(pool_id), &amount);
}

pub fn get_pool_balance(env: &Env, pool_id: u32) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::PoolBalance(pool_id))
        .unwrap_or(0)
}

pub fn set_pending_withdrawal(env: &Env, pool_id: u32, user: Address, request: &WithdrawalRequest) {
    env.storage()
        .persistent()
        .set(&DataKey::PendingWithdrawal(pool_id, user), request);
}

pub fn get_pending_withdrawal(env: &Env, pool_id: u32, user: Address) -> Option<WithdrawalRequest> {
    env.storage()
        .persistent()
        .get(&DataKey::PendingWithdrawal(pool_id, user))
}

pub fn set_allocation(env: &Env, pool_id: u32, weight_bps: u32) {
    env.storage().persistent().set(&DataKey::Allocation(pool_id), &weight_bps);
}

pub fn get_allocation(env: &Env, pool_id: u32) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::Allocation(pool_id))
        .unwrap_or(0)
}
