use soroban_sdk::{contracttype, Address, Env};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Governance,
    PoolBalance(u32),
    PendingWithdrawal(u32, Address),
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
