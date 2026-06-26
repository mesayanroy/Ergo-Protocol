/// Computes auction discount in basis points over elapsed ledgers.
pub fn discount_bps(elapsed_ledgers: u32, max_ledgers: u32, max_discount_bps: u32) -> u32 {
    if max_ledgers == 0 {
        return max_discount_bps;
    }
    let ratio = (elapsed_ledgers.min(max_ledgers) as u64 * max_discount_bps as u64) / max_ledgers as u64;
    ratio as u32
}
