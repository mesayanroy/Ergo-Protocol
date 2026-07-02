use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage::{self, Proposal, ProposalType};
use crate::timelock;

/// Creates a governance proposal.
pub fn create_proposal(
    env: &Env,
    creator: Address,
    target: Address,
    action: Symbol,
    proposal_type: ProposalType,
) -> Result<Proposal, Error> {
    creator.require_auth();

    // Check if target is whitelisted
    if !storage::is_whitelisted(env, target.clone()) {
        return Err(Error::NotWhitelisted);
    }

    let mut count = storage::get_proposal_count(env);
    count = count.saturating_add(1);
    storage::set_proposal_count(env, count);

    let end_time = env.ledger().timestamp().saturating_add(86_400); // 1 day voting period
    let proposal = Proposal {
        id: count,
        proposer: creator,
        target,
        action,
        proposal_type,
        start_ledger: env.ledger().sequence(),
        eta: 0,
        executed: false,
        votes_for: 0,
        votes_against: 0,
        end_time,
        status: 0, // Active
    };
    storage::set_proposal(env, count, &proposal);

    env.events().publish((Symbol::new(env, "ProposalCreated"), count), proposal.end_time);
    Ok(proposal)
}

/// Finalizes proposal voting state checking quorum and threshold criteria.
pub fn finalize_proposal(env: &Env, proposal_id: u64) -> Result<(), Error> {
    let mut proposal = storage::get_proposal(env, proposal_id).ok_or(Error::ProposalNotFound)?;
    if env.ledger().timestamp() < proposal.end_time {
        return Err(Error::TimelockNotExpired); // voting period has not ended
    }
    if proposal.status != 0 {
        return Err(Error::AlreadyExecuted);
    }

    let total_votes = proposal.votes_for + proposal.votes_against;
    let total_power: i128 = 10_000; // Mock total voting power in ecosystem

    // 1. Quorum check >= 15% of total power
    if total_votes.saturating_mul(100) < total_power.saturating_mul(15) {
        proposal.status = 3; // Defeated
        storage::set_proposal(env, proposal_id, &proposal);
        return Err(Error::QuorumNotMet);
    }

    // 2. Yes votes check >= 66% of votes cast
    if total_votes == 0 || proposal.votes_for.saturating_mul(100) < total_votes.saturating_mul(66) {
        proposal.status = 3; // Defeated
        storage::set_proposal(env, proposal_id, &proposal);
        return Err(Error::ThresholdNotMet);
    }

    // Quorum and threshold met: set state to TimelockPending and record eta sequence
    proposal.status = 1; // TimelockPending
    
    let delay_ledgers = timelock::timelock_for_type(&proposal.proposal_type);
    proposal.eta = env.ledger().sequence().saturating_add(delay_ledgers) as u64;

    storage::set_proposal(env, proposal_id, &proposal);
    env.events().publish((Symbol::new(env, "ProposalFinalized"), proposal_id), proposal.eta);
    Ok(())
}
