use soroban_sdk::Env;

use crate::errors::Error;

/// Executes protocol-owned fallback liquidation path after auction timeout.
pub fn run_protocol_liquidator(_env: &Env, _auction_id: u64) -> Result<(), Error> {
    Ok(())
}
