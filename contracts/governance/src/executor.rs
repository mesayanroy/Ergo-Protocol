use soroban_sdk::{Address, Env, Symbol, IntoVal};

use crate::errors::Error;
use crate::storage;
use crate::timelock;
use crate::emitter;

/// Executes Only whitelisted proposal actions.
pub fn execute_proposal(env: &Env, proposal_id: u64) -> Result<(), Error> {
    let mut proposal = storage::get_proposal(env, proposal_id).ok_or(Error::ProposalNotFound)?;
    if proposal.executed {
        return Err(Error::ProposalNotFound);
    }

    if env.ledger().timestamp() < proposal.end_time {
        return Err(Error::VotingClosed);
    }

    if proposal.votes_for <= proposal.votes_against {
        return Err(Error::InvalidAction);
    }

    // Check if target is whitelisted
    if !storage::is_whitelisted(env, proposal.target.clone()) {
        return Err(Error::Unauthorized);
    }

    // Check timelock
    let delay_ledgers = timelock::timelock_for(proposal.action.clone());
    let delay_seconds = (delay_ledgers as u64).saturating_mul(5);
    let min_eta = proposal.end_time.saturating_add(delay_seconds);

    if env.ledger().timestamp() < min_eta {
        return Err(Error::TimelockActive);
    }

    // Invoke target governance callback
    let _: () = env.invoke_contract(
        &proposal.target,
        &proposal.action,
        soroban_sdk::vec![env],
    );

    proposal.executed = true;
    storage::set_proposal(env, proposal_id, &proposal);

    emitter::emit_action(env, proposal.action);
    Ok(())
}
