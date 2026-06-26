/// Computes utilization-based interest rates.
pub fn get_borrow_rate_bps(utilization_bps: u32, base_bps: u32, slope_bps: u32) -> u32 {
    base_bps.saturating_add(((utilization_bps as u64 * slope_bps as u64) / 10_000) as u32)
}
