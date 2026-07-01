use soroban_sdk::{Address, Env, Symbol};
use crate::storage::{self, MarketConfig};

/// Returns the boosted collateral factor if E-Mode is active for the user's position.
pub fn get_effective_collateral_factor(env: &Env, user: &Address, market: &MarketConfig) -> u32 {
    if market.emode_category == 0 {
        return market.collateral_factor;
    }
    
    // E-Mode is active if the user only has supplies/borrows in this E-Mode category.
    let markets = storage::get_markets(env);
    let mut in_emode = true;
    for m_id in markets.iter() {
        let pos = storage::get_position(env, m_id.clone(), user.clone());
        if pos.supplied > 0 || pos.borrowed > 0 {
            if let Some(m_config) = storage::get_market_config(env, m_id) {
                if m_config.emode_category != market.emode_category {
                    in_emode = false;
                    break;
                }
            }
        }
    }
    
    if in_emode {
        9_000 // 90% LTV override for correlated E-Mode category
    } else {
        market.collateral_factor
    }
}
