use soroban_sdk::{Address, Env, Symbol, Vec};

use crate::errors::Error;
use crate::storage;

const MAX_STALENESS: u32 = 50;
const MAX_DEVIATION_BPS: i128 = 2_000;

/// Returns the median price for an asset from valid feeds.
///
/// Failure conditions:
/// - Returns `Error::NoValidFeeds` when no non-stale feed data is available.
pub fn get_price(env: &Env, asset: Symbol) -> Result<i128, Error> {
    if storage::is_tripped(env, asset.clone()) {
        return Err(Error::CircuitBreakerTripped);
    }

    let now = env.ledger().sequence() as u32;
    let feeds = storage::get_feeds(env, asset.clone());
    let mut prices = Vec::new(env);

    for sample in feeds.iter() {
        if sample.price <= 0 {
            continue;
        }
        if now.saturating_sub(sample.updated_ledger) > MAX_STALENESS {
            continue;
        }
        prices.push_back(sample.price);
    }

    if prices.is_empty() {
        return Err(Error::NoValidFeeds);
    }

    let median_price = median(prices.clone())?;
    for price in prices.iter() {
        let diff = if price > median_price {
            price - median_price
        } else {
            median_price - price
        };
        if diff.saturating_mul(10_000) > median_price.saturating_mul(MAX_DEVIATION_BPS) {
            storage::set_tripped(env, asset, true);
            return Err(Error::FeedDeviated);
        }
    }

    Ok(median_price)
}

/// Computes median over provided samples.
pub fn median(mut prices: Vec<i128>) -> Result<i128, Error> {
    if prices.is_empty() {
        return Err(Error::NoValidFeeds);
    }

    // Soroban Vec does not expose in-place sort helpers, so we insertion-sort manually.
    let len = prices.len();
    let mut i = 1;
    while i < len {
        let key = prices.get(i).ok_or(Error::NoValidFeeds)?;
        let mut j = i;

        while j > 0 {
            let left = prices.get(j - 1).ok_or(Error::NoValidFeeds)?;
            if left <= key {
                break;
            }
            prices.set(j, left);
            j -= 1;
        }

        prices.set(j, key);
        i += 1;
    }

    let idx = (len - 1) / 2;
    prices.get(idx).ok_or(Error::NoValidFeeds)
}

/// Validates feed array non-empty.
pub fn validate_feeds(_env: &Env, _asset: Symbol, feeds: Vec<Address>) -> Result<(), Error> {
    if feeds.is_empty() {
        return Err(Error::NoValidFeeds);
    }
    Ok(())
}
