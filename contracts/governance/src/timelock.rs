use soroban_sdk::{Env, Symbol};

/// Returns timelock duration in ledgers by proposal type.
pub fn timelock_for(action: Symbol) -> u32 {
    let emergency_pause = soroban_sdk::symbol_short!("PAUSE");
    if action == emergency_pause {
        return 30;
    }
    300
}

/// Checks whether timelock has elapsed.
pub fn can_execute(_env: &Env, created_ledger: u32, delay: u32, now_ledger: u32) -> bool {
    now_ledger >= created_ledger.saturating_add(delay)
}
