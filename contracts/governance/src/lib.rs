#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

pub mod emitter;
pub mod errors;
pub mod executor;
pub mod proposals;
pub mod timelock;
pub mod voting;

use crate::errors::Error;

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    /// Creates proposal and records initial metadata.
    pub fn create_proposal(env: Env, creator: Address, action: Symbol) -> Result<u64, Error> {
        let proposal = proposals::create_proposal(&env, creator, action)?;
        Ok(proposal.id)
    }

    /// Casts governance vote.
    pub fn vote(env: Env, voter: Address, proposal_id: u64, support: bool) -> Result<(), Error> {
        voting::vote(&env, voter, proposal_id, support)
    }

    /// Finalizes proposal result.
    pub fn finalize_proposal(env: Env, proposal_id: u64) -> Result<(), Error> {
        proposals::finalize_proposal(&env, proposal_id)
    }

    /// Executes finalized proposal action if whitelisted.
    pub fn execute_proposal(env: Env, action: Symbol) -> Result<(), Error> {
        executor::execute_proposal(&env, action)
    }
}
