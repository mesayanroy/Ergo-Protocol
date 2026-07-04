use soroban_sdk::{Address, Env};
use crate::storage;
use crate::errors::Error;

pub fn transfer(env: &Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
    if amount < 0 {
        return Err(Error::NegativeAmount);
    }
    from.require_auth();

    let balance_from = storage::get_balance(env, &from);
    if balance_from < amount {
        return Err(Error::InsufficientBalance);
    }

    storage::set_balance(env, &from, balance_from - amount);
    let balance_to = storage::get_balance(env, &to);
    storage::set_balance(env, &to, balance_to + amount);

    Ok(())
}

pub fn transfer_from(env: &Env, spender: Address, from: Address, to: Address, amount: i128) -> Result<(), Error> {
    if amount < 0 {
        return Err(Error::NegativeAmount);
    }
    spender.require_auth();

    let allowance = storage::get_allowance(env, &from, &spender);
    if allowance < amount {
        return Err(Error::InsufficientAllowance);
    }

    let balance_from = storage::get_balance(env, &from);
    if balance_from < amount {
        return Err(Error::InsufficientBalance);
    }

    storage::set_allowance(env, &from, &spender, allowance - amount);
    storage::set_balance(env, &from, balance_from - amount);
    let balance_to = storage::get_balance(env, &to);
    storage::set_balance(env, &to, balance_to + amount);

    Ok(())
}

pub fn approve(env: &Env, from: Address, spender: Address, amount: i128, _expiration_ledger: u32) -> Result<(), Error> {
    if amount < 0 {
        return Err(Error::NegativeAmount);
    }
    from.require_auth();

    storage::set_allowance(env, &from, &spender, amount);
    Ok(())
}
