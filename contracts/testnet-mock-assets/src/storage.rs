use soroban_sdk::{contracttype, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Allowance(AllowanceKey),
    Balance(Address),
    Decimals,
    Name,
    Symbol,
    TotalSupply,
}

#[contracttype]
#[derive(Clone)]
pub struct AllowanceKey {
    pub from: Address,
    pub spender: Address,
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_balance(env: &Env, addr: &Address) -> i128 {
    env.storage().persistent().get(&DataKey::Balance(addr.clone())).unwrap_or(0)
}

pub fn set_balance(env: &Env, addr: &Address, amount: i128) {
    env.storage().persistent().set(&DataKey::Balance(addr.clone()), &amount);
}

pub fn get_allowance(env: &Env, from: &Address, spender: &Address) -> i128 {
    let key = AllowanceKey {
        from: from.clone(),
        spender: spender.clone(),
    };
    env.storage().persistent().get(&DataKey::Allowance(key)).unwrap_or(0)
}

pub fn set_allowance(env: &Env, from: &Address, spender: &Address, amount: i128) {
    let key = AllowanceKey {
        from: from.clone(),
        spender: spender.clone(),
    };
    env.storage().persistent().set(&DataKey::Allowance(key), &amount);
}

pub fn get_total_supply(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0)
}

pub fn set_total_supply(env: &Env, amount: i128) {
    env.storage().instance().set(&DataKey::TotalSupply, &amount);
}

pub fn get_metadata(env: &Env) -> (u32, soroban_sdk::String, soroban_sdk::String) {
    let decimals: u32 = env.storage().instance().get(&DataKey::Decimals).unwrap_or(7);
    let name: soroban_sdk::String = env.storage().instance().get(&DataKey::Name).unwrap();
    let symbol: soroban_sdk::String = env.storage().instance().get(&DataKey::Symbol).unwrap();
    (decimals, name, symbol)
}

pub fn set_metadata(env: &Env, decimals: u32, name: &soroban_sdk::String, symbol: &soroban_sdk::String) {
    env.storage().instance().set(&DataKey::Decimals, &decimals);
    env.storage().instance().set(&DataKey::Name, name);
    env.storage().instance().set(&DataKey::Symbol, symbol);
}
