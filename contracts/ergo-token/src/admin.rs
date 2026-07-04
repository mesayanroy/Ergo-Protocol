use soroban_sdk::{Address, Env};
use crate::storage;
use crate::errors::Error;

pub fn has_admin(env: &Env) -> bool {
    storage::get_admin(env).is_some()
}

pub fn require_admin(env: &Env) -> Result<Address, Error> {
    let admin = storage::get_admin(env).ok_or(Error::NotAuthorized)?;
    admin.require_auth();
    Ok(admin)
}

pub fn mint(env: &Env, to: Address, amount: i128) -> Result<(), Error> {
    if amount < 0 {
        return Err(Error::NegativeAmount);
    }
    require_admin(env)?;

    let balance = storage::get_balance(env, &to);
    storage::set_balance(env, &to, balance + amount);

    let supply = storage::get_total_supply(env);
    storage::set_total_supply(env, supply + amount);

    Ok(())
}

pub fn burn(env: &Env, from: Address, amount: i128) -> Result<(), Error> {
    if amount < 0 {
        return Err(Error::NegativeAmount);
    }
    from.require_auth();

    let balance = storage::get_balance(env, &from);
    if balance < amount {
        return Err(Error::InsufficientBalance);
    }

    storage::set_balance(env, &from, balance - amount);

    let supply = storage::get_total_supply(env);
    storage::set_total_supply(env, supply - amount);

    Ok(())
}

pub fn burn_from(env: &Env, spender: Address, from: Address, amount: i128) -> Result<(), Error> {
    if amount < 0 {
        return Err(Error::NegativeAmount);
    }
    spender.require_auth();

    let allowance = storage::get_allowance(env, &from, &spender);
    if allowance < amount {
        return Err(Error::InsufficientAllowance);
    }

    let balance = storage::get_balance(env, &from);
    if balance < amount {
        return Err(Error::InsufficientBalance);
    }

    storage::set_allowance(env, &from, &spender, allowance - amount);
    storage::set_balance(env, &from, balance - amount);

    let supply = storage::get_total_supply(env);
    storage::set_total_supply(env, supply - amount);

    Ok(())
}

pub fn set_admin(env: &Env, new_admin: Address) -> Result<(), Error> {
    require_admin(env)?;
    storage::set_admin(env, &new_admin);
    Ok(())
}
