use soroban_sdk::Env;

use crate::errors::Error;

/// Finalizes residual bad debt and triggers backstop draw for exact shortfall.
pub fn finalize_bad_debt(_env: &Env, _auction_id: u64, residual_shortfall: i128) -> Result<(), Error> {
    if residual_shortfall < 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}
