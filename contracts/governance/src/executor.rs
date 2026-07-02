use soroban_sdk::{Address, Env, Symbol, IntoVal};

use crate::errors::Error;
use crate::storage;
use crate::timelock;
use crate::emitter;

/// Executes whitelisted proposal actions after timelock expires.
pub fn execute_proposal(env: &Env, proposal_id: u64) -> Result<(), Error> {
    let mut proposal = storage::get_proposal(env, proposal_id).ok_or(Error::ProposalNotFound)?;
    if proposal.executed || proposal.status == 2 {
        return Err(Error::AlreadyExecuted);
    }

    if proposal.status != 1 {
        return Err(Error::InvalidAction);
    }

    // Check if target is whitelisted
    if !storage::is_whitelisted(env, proposal.target.clone()) {
        return Err(Error::NotWhitelisted);
    }

    // Check timelock expiration sequence
    if env.ledger().sequence() < proposal.eta as u32 {
        return Err(Error::TimelockActive);
    }

    // Invoke target governance callback
    let _: () = env.invoke_contract(
        &proposal.target,
        &proposal.action,
        soroban_sdk::vec![env],
    );

    proposal.executed = true;
    proposal.status = 2; // Executed
    storage::set_proposal(env, proposal_id, &proposal);

    emitter::emit_action(env, proposal.action);
    Ok(())
}
