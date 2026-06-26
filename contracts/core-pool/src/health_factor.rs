use crate::errors::Error;

/// Returns health factor represented in basis points where 10_000 equals 1.0.
///
/// Failure conditions:
/// - Returns `Error::InvalidAmount` when debt is negative.
pub fn get_health_factor(collateral_value: i128, debt_value: i128) -> Result<i128, Error> {
    if debt_value < 0 {
        return Err(Error::InvalidAmount);
    }
    if debt_value == 0 {
        return Ok(i128::MAX);
    }
    Ok(collateral_value.saturating_mul(10_000) / debt_value)
}
