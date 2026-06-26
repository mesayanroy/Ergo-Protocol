use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    FeedNotFound = 2,
    FeedStale = 3,
    CircuitBreakerTripped = 4,
    NoValidFeeds = 5,
    FeedDeviated = 6,
    Unsupported = 99,
}
