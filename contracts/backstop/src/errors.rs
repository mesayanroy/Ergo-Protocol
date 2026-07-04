use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    InvalidAmount = 2,
    PoolNotFound = 3,
    CooldownActive = 4,
    InsufficientFunds = 5,
    CooldownNotMet = 6,
}
