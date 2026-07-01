use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage::{self, Proposal};
use crate::timelock;

/// Creates a governance proposal.
pub fn create_proposal(
    env: &Env,
    creator: Address,
    target: Address,
    action: Symbol,
) -> Result<Proposal, Error> {
    creator.require_auth();

    let mut count = storage::get_proposal_count(env);
    count = count.saturating_add(1);
    storage::set_proposal_count(env, count);

    let end_time = env.ledger().timestamp().saturating_add(86_400); // 1 day voting period
    let proposal = Proposal {
        id: count,
        proposer: creator,
        target,
        action,
        start_ledger: env.ledger().sequence(),
        eta: 0,
        executed: false,
        votes_for: 0,
        votes_against: 0,
        end_time,
    };
    storage::set_proposal(env, count, &proposal);

    env.events().publish((Symbol::new(env, "ProposalCreated"), count), proposal.end_time);
    Ok(proposal)
}

/// Finalizes proposal voting state.
pub fn finalize_proposal(env: &Env, proposal_id: u64) -> Result<(), Error> {
    let mut proposal = storage::get_proposal(env, proposal_id).ok_or(Error::ProposalNotFound)?;
    if env.ledger().timestamp() < proposal.end_time {
        return Err(Error::VotingClosed);
    }

    if proposal.votes_for > proposal.votes_against {
        let delay_ledgers = timelock::timelock_for(proposal.action.clone());
        // Translate delay ledgers to estimated seconds (e.g. 5 seconds per ledger)
        let delay_seconds = (delay_ledgers as u64).saturating_mul(5);
        proposal.eta = env.ledger().timestamp().saturating_add(delay_seconds);
    }

    storage::set_proposal(env, proposal_id, &proposal);
    env.events().publish((Symbol::new(env, "ProposalFinalized"), proposal_id), proposal.eta);
    Ok(())
}
