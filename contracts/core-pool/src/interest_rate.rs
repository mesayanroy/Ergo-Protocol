/// Computes utilization-based interest rates.
pub fn get_borrow_rate_bps(utilization_bps: u32, base_bps: u32, slope_bps: u32) -> u32 {
    base_bps.saturating_add(((utilization_bps as u64 * slope_bps as u64) / 10_000) as u32)
}

/// Returns utilization rate in basis points.
pub fn get_utilization_rate(supplied: i128, borrowed: i128) -> u32 {
    if supplied <= 0 {
        return 0;
    }
    (borrowed.saturating_mul(10_000) / supplied) as u32
}

/// Returns borrow interest rate in basis points using a base of 2% and slope of 8%.
pub fn get_borrow_rate(supplied: i128, borrowed: i128) -> u32 {
    let utilization = get_utilization_rate(supplied, borrowed);
    get_borrow_rate_bps(utilization, 200, 800)
}
