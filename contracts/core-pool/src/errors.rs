use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    InvalidAmount = 2,
    MarketNotFound = 3,
    MarketPaused = 4,
    HealthFactorTooLow = 5,
    FlashLoanNotRepaid = 6,
    MarketAlreadyExists = 7,
    InsufficientLiquidity = 8,
    InsufficientCollateral = 9,
    DebtCeilingExceeded = 10,
    OracleCircuitBreakerActive = 11,
    Unsupported = 99,
}
