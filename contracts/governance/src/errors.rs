use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    ProposalNotFound = 2,
    VotingClosed = 3,
    TimelockActive = 4,
    InvalidAction = 5,
}
