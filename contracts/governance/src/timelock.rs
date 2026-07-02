use crate::storage::ProposalType;

/// Returns timelock duration in ledgers by proposal type.
pub fn timelock_for_type(p_type: &ProposalType) -> u32 {
    match p_type {
        ProposalType::MarketPauseResume => 10,
        ProposalType::BackstopAllocationDecision => 2000,
        _ => 500,
    }
}

/// Checks whether timelock has elapsed.
pub fn is_executable(current_ledger: u32, finalized_at: u32, timelock: u32) -> bool {
    current_ledger >= finalized_at.saturating_add(timelock)
}
