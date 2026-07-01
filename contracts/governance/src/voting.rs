use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;

/// Casts a vote on a proposal.
pub fn vote(env: &Env, voter: Address, proposal_id: u64, support: bool) -> Result<(), Error> {
    voter.require_auth();

    let mut proposal = storage::get_proposal(env, proposal_id).ok_or(Error::ProposalNotFound)?;
    if env.ledger().timestamp() >= proposal.end_time {
        return Err(Error::VotingClosed);
    }

    let weight: i128 = 100; // Mock voting power weight
    if support {
        proposal.votes_for = proposal.votes_for.saturating_add(weight);
    } else {
        proposal.votes_against = proposal.votes_against.saturating_add(weight);
    }

    storage::set_proposal(env, proposal_id, &proposal);
    env.events().publish((Symbol::new(env, "VoteCast"), proposal_id, voter), support);
    Ok(())
}
