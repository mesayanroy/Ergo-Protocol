use soroban_sdk::{Address, Env, Symbol, Vec, IntoVal};

use crate::errors::Error;
use crate::storage;

const MAX_STALENESS_SECONDS: u64 = 300; // 5 minutes
const MAX_DEVIATION_BPS: i128 = 2_000;  // 20%
const MIN_FEED_QUORUM: u32 = 1;

fn fetch_from_feed(env: &Env, feed: &Address, asset: Symbol) -> Result<(i128, u64), Error> {
    let args = soroban_sdk::vec![env, asset.into_val(env)];
    match env.try_invoke_contract::<(i128, u64)>(feed, &Symbol::new(env, "last_price"), args) {
        Ok(val) => Ok(val),
        Err(_) => Err(Error::FeedNotFound),
    }
}

/// Returns the median price for an asset from valid feeds.
///
/// Failure conditions:
/// - Returns `Error::CircuitBreakerTripped` if tripped.
/// - Returns `Error::NoValidFeeds` when no non-stale feed data is available.
pub fn get_price(env: &Env, asset: Symbol) -> Result<i128, Error> {
    if storage::is_tripped(env, asset.clone()) {
        return Err(Error::CircuitBreakerTripped);
    }

    let now = env.ledger().timestamp();
    let feeds = storage::get_feeds(env, asset.clone());
    let mut prices = Vec::new(env);

    for feed in feeds.iter() {
        if let Ok((price, timestamp)) = fetch_from_feed(env, &feed, asset.clone()) {
            if price > 0 && now.saturating_sub(timestamp) <= MAX_STALENESS_SECONDS {
                prices.push_back(price);
            }
        }
    }

    if prices.len() < MIN_FEED_QUORUM {
        return Err(Error::NoValidFeeds);
    }

    let median_price = median(prices.clone())?;

    // Check deviation - if any feed deviates more than MAX_DEVIATION_BPS, trip breaker
    for price in prices.iter() {
        let diff = if price > median_price {
            price - median_price
        } else {
            median_price - price
        };
        // diff * 10,000 > median_price * MAX_DEVIATION_BPS
        if diff.saturating_mul(10_000) > median_price.saturating_mul(MAX_DEVIATION_BPS) {
            storage::set_tripped(env, asset.clone(), true);
            return Err(Error::FeedDeviated);
        }
    }

    storage::set_last_good_price(env, asset, median_price);
    Ok(median_price)
}

/// Computes median over provided samples.
pub fn median(mut prices: Vec<i128>) -> Result<i128, Error> {
    let len = prices.len();
    if len == 0 {
        return Err(Error::NoValidFeeds);
    }

    // Manual insertion sort
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
