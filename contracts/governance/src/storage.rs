use soroban_sdk::{contracttype, Address, Env, Symbol};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum ProposalType {
    MarketPauseResume = 1,
    OracleCircuitBreakerOverride = 2,
    BackstopAllocationDecision = 3,
    CompliancePermissioning = 4,
    RiskParamUpdate = 5,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub target: Address,
    pub action: Symbol,
    pub proposal_type: ProposalType,
    pub start_ledger: u32,
    pub eta: u64,
    pub executed: bool,
    pub votes_for: i128,
    pub votes_against: i128,
    pub end_time: u64,
    pub status: u32, // 0 = Active, 1 = TimelockPending, 2 = Executed, 3 = Defeated
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Whitelisted(Address),
    Proposal(u64),
    ProposalCount,
    Voted(u64, Address),
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

pub fn set_whitelisted(env: &Env, contract: Address, whitelisted: bool) {
    env.storage().persistent().set(&DataKey::Whitelisted(contract), &whitelisted);
}

pub fn is_whitelisted(env: &Env, contract: Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Whitelisted(contract))
        .unwrap_or(false)
}

pub fn get_proposal_count(env: &Env) -> u64 {
    env.storage().persistent().get(&DataKey::ProposalCount).unwrap_or(0)
}

pub fn set_proposal_count(env: &Env, count: u64) {
    env.storage().persistent().set(&DataKey::ProposalCount, &count);
}

pub fn set_proposal(env: &Env, id: u64, proposal: &Proposal) {
    env.storage().persistent().set(&DataKey::Proposal(id), proposal);
}

pub fn get_proposal(env: &Env, id: u64) -> Option<Proposal> {
    env.storage().persistent().get(&DataKey::Proposal(id))
}

pub fn has_voted(env: &Env, proposal_id: u64, voter: Address) -> bool {
    env.storage().persistent().get(&DataKey::Voted(proposal_id, voter)).unwrap_or(false)
}

pub fn set_voted(env: &Env, proposal_id: u64, voter: Address) {
    env.storage().persistent().set(&DataKey::Voted(proposal_id, voter), &true);
}
