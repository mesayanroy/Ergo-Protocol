use soroban_sdk::{token, Address, Env};

use crate::errors::Error;
use crate::storage::{self, WithdrawalRequest};

const COOLDOWN_SECONDS: u64 = 10;

/// Deposits insurance capital into a backstop pool.
pub fn deposit(env: &Env, user: Address, pool_id: u32, amount: i128) -> Result<(), Error> {
    user.require_auth();
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    let base_asset = storage::get_base_asset(env).ok_or(Error::PoolNotFound)?;
    let client = token::Client::new(env, &base_asset);
    client.transfer(&user, &env.current_contract_address(), &amount);

    let next_user = storage::get_user_balance(env, pool_id, user.clone()).saturating_add(amount);
    storage::set_user_balance(env, pool_id, user.clone(), next_user);

    let next_pool = storage::get_pool_balance(env, pool_id).saturating_add(amount);
    storage::set_pool_balance(env, pool_id, next_pool);

    env.events().publish((soroban_sdk::Symbol::new(env, "Deposit"), user, pool_id), amount);
    Ok(())
}

/// Queues withdrawal with cooldown semantics.
pub fn queue_withdrawal(env: &Env, user: Address, pool_id: u32, amount: i128) -> Result<(), Error> {
    user.require_auth();
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    let active_bal = storage::get_user_balance(env, pool_id, user.clone());
    if active_bal < amount {
        return Err(Error::InsufficientFunds);
    }

    let next_user = active_bal - amount;
    storage::set_user_balance(env, pool_id, user.clone(), next_user);

    let next_pool = storage::get_pool_balance(env, pool_id) - amount;
    storage::set_pool_balance(env, pool_id, next_pool);

    let unlock_timestamp = env.ledger().timestamp().saturating_add(COOLDOWN_SECONDS);
    storage::set_pending_withdrawal(
        env,
        pool_id,
        user.clone(),
        &WithdrawalRequest {
            amount,
            unlock_timestamp,
        },
    );

    env.events().publish((soroban_sdk::Symbol::new(env, "QueueWithdrawal"), user, pool_id), amount);
    Ok(())
}

/// Claims queued withdrawal after cooldown expires.
pub fn claim_withdrawal(env: &Env, user: Address, pool_id: u32) -> Result<(), Error> {
    user.require_auth();
    let request = storage::get_pending_withdrawal(env, pool_id, user.clone()).ok_or(Error::InsufficientFunds)?;
    
    if env.ledger().timestamp() < request.unlock_timestamp {
        return Err(Error::CooldownNotMet);
    }

    // Clear request
    storage::set_pending_withdrawal(
        env,
        pool_id,
        user.clone(),
        &WithdrawalRequest {
            amount: 0,
            unlock_timestamp: 0,
        },
    );

    let base_asset = storage::get_base_asset(env).ok_or(Error::PoolNotFound)?;
    let client = token::Client::new(env, &base_asset);
    client.transfer(&env.current_contract_address(), &user, &request.amount);

    env.events().publish((soroban_sdk::Symbol::new(env, "ClaimWithdrawal"), user, pool_id), request.amount);
    Ok(())
}
