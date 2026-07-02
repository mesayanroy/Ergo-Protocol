use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    ProposalNotFound = 2,
    QuorumNotMet = 3,
    ThresholdNotMet = 4,
    TimelockNotExpired = 5,
    NotWhitelisted = 6,
    AlreadyVoted = 7,
    AlreadyExecuted = 8,
    VotingClosed = 9,
    TimelockActive = 10,
    InvalidAction = 11,
}
