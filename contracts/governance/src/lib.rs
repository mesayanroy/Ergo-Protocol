#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

pub mod emitter;
pub mod errors;
pub mod executor;
pub mod proposals;
pub mod storage;
pub mod timelock;
pub mod voting;

use crate::errors::Error;
use crate::storage::Proposal;

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    /// Initializes governance contract admin.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if storage::get_admin(&env).is_some() {
            return Err(Error::Unauthorized);
        }
        storage::set_admin(&env, &admin);
        Ok(())
    }

    /// Configures whitelist status for a target contract.
    pub fn set_whitelisted(
        env: Env,
        admin: Address,
        contract: Address,
        whitelisted: bool,
    ) -> Result<(), Error> {
        admin.require_auth();
        let stored_admin = storage::get_admin(&env).ok_or(Error::Unauthorized)?;
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        storage::set_whitelisted(&env, contract, whitelisted);
        Ok(())
    }

    /// Creates proposal and records initial metadata.
    pub fn create_proposal(
        env: Env,
        creator: Address,
        target: Address,
        action: Symbol,
    ) -> Result<u64, Error> {
        let proposal = proposals::create_proposal(&env, creator, target, action)?;
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
    pub fn execute_proposal(env: Env, proposal_id: u64) -> Result<(), Error> {
        executor::execute_proposal(&env, proposal_id)
    }

    /// Queries proposal state.
    pub fn get_proposal(env: Env, proposal_id: u64) -> Result<Proposal, Error> {
        storage::get_proposal(&env, proposal_id).ok_or(Error::ProposalNotFound)
    }
}
