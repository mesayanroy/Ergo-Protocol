use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AuctionNotFound = 1,
    AuctionExpired = 2,
    InvalidAmount = 3,
    Unauthorized = 4,
    Unsupported = 99,
}
