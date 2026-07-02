#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env, symbol_short, Symbol, contract, contractimpl};
use crate::{proposals, voting, executor, storage::{self, ProposalType}, errors::Error};

#[contract]
pub struct MockTargetContract;

#[contractimpl]
impl MockTargetContract {
    pub fn do_gov(env: Env) {
        env.storage().instance().set(&symbol_short!("done"), &true);
    }
}

fn setup_env(env: &Env) -> (Address, Address, Address) {
    let admin = Address::generate(env);
    storage::set_admin(env, &admin);
    let target = env.register_contract(None, MockTargetContract);
    let creator = Address::generate(env);
    (admin, target, creator)
}

#[test]
fn test_non_whitelisted_target_reverts() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, target, creator) = setup_env(&env);

    // target is NOT whitelisted yet
    let res = proposals::create_proposal(&env, creator, target, symbol_short!("do_gov"), ProposalType::RiskParamUpdate);
    assert_eq!(res.unwrap_err(), Error::NotWhitelisted);
}

#[test]
fn test_proposal_executes_correctly_after_timelock() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, target, creator) = setup_env(&env);

    storage::set_whitelisted(&env, target.clone(), true);

    let proposal = proposals::create_proposal(
        &env,
        creator.clone(),
        target.clone(),
        symbol_short!("do_gov"),
        ProposalType::MarketPauseResume // Timelock = 10 ledgers
    ).unwrap();

    // Vote yes
    // We need 15% quorum of 10,000, which is 1,500. So we need 15 voters to hit quorum!
    for _ in 0..15 {
        let voter = Address::generate(&env);
        voting::vote(&env, voter, proposal.id, true).unwrap();
    }

    // Advance timestamp to end voting
    env.ledger().set_timestamp(env.ledger().timestamp() + 90_000);

    proposals::finalize_proposal(&env, proposal.id).unwrap();

    // Execute immediately should fail (timelock active)
    let res_exec = executor::execute_proposal(&env, proposal.id);
    assert_eq!(res_exec.unwrap_err(), Error::TimelockActive);

    // Advance ledger sequence by 10 ledgers (emergency pause timelock)
    env.ledger().set_sequence(env.ledger().sequence() + 11);

    // Execute should now succeed!
    executor::execute_proposal(&env, proposal.id).unwrap();

    // Verify side effect in MockTargetContract
    let done: bool = env.as_contract(&target, || {
        env.storage().instance().get(&symbol_short!("done")).unwrap_or(false)
    });
    assert!(done);
}

#[test]
fn test_double_vote_reverts() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, target, creator) = setup_env(&env);

    storage::set_whitelisted(&env, target.clone(), true);

    let proposal = proposals::create_proposal(
        &env,
        creator.clone(),
        target,
        symbol_short!("do_gov"),
        ProposalType::RiskParamUpdate
    ).unwrap();

    let voter = Address::generate(&env);
    voting::vote(&env, voter.clone(), proposal.id, true).unwrap();

    // Second vote from same voter should fail
    let res = voting::vote(&env, voter, proposal.id, false);
    assert_eq!(res.unwrap_err(), Error::AlreadyVoted);
}

#[test]
fn test_quorum_check_fails_below_15_percent() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, target, creator) = setup_env(&env);

    storage::set_whitelisted(&env, target.clone(), true);

    let proposal = proposals::create_proposal(
        &env,
        creator.clone(),
        target,
        symbol_short!("do_gov"),
        ProposalType::RiskParamUpdate
    ).unwrap();

    // Only 1 voter (100 weight), which is < 15% of 10,000 (1,500)
    let voter = Address::generate(&env);
    voting::vote(&env, voter, proposal.id, true).unwrap();

    // Advance timestamp to end voting
    env.ledger().set_timestamp(env.ledger().timestamp() + 90_000);

    // Finalize should fail with QuorumNotMet
    let res = proposals::finalize_proposal(&env, proposal.id);
    assert_eq!(res.unwrap_err(), Error::QuorumNotMet);
}
