use soroban_sdk::{Address, Env};

use crate::errors::Error;

/// Casts a vote on a proposal.
pub fn vote(_env: &Env, _voter: Address, _proposal_id: u64, _support: bool) -> Result<(), Error> {
    Ok(())
}
