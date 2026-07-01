use soroban_sdk::{token, Address, Env, Symbol, IntoVal};

use crate::errors::Error;
use crate::storage;

/// Executes a flash loan action atomically.
///
/// Failure conditions:
/// - Returns `Error::InvalidAmount` when `amount` is non-positive.
/// - Returns `Error::FlashLoanNotRepaid` when callback settlement does not repay principal.
pub fn flash_loan(
    env: &Env,
    borrower: Address,
    market_id: Symbol,
    amount: i128,
) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let config = storage::get_market_config(env, market_id).ok_or(Error::MarketNotFound)?;
    if !config.active {
        return Err(Error::MarketPaused);
    }

    let client = token::Client::new(env, &config.asset);
    let balance_before = client.balance(&env.current_contract_address());

    if balance_before < amount {
        return Err(Error::InsufficientLiquidity);
    }

    // Transfer asset to borrower
    client.transfer(&env.current_contract_address(), &borrower, &amount);

    // Invoke callback on borrower: borrower.execute_op(amount)
    let _: () = env.invoke_contract(
        &borrower,
        &Symbol::new(env, "execute_op"),
        soroban_sdk::vec![
            env,
            env.current_contract_address().into_val(env),
            amount.into_val(env)
        ],
    );

    // Verify repayment
    let balance_after = client.balance(&env.current_contract_address());
    if balance_after < balance_before {
        return Err(Error::FlashLoanNotRepaid);
    }

    Ok(())
}
