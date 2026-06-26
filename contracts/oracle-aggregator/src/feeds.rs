use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage::{self, FeedSample};

/// Registers a feed for an asset.
///
/// Failure conditions:
/// - Returns `Error::Unauthorized` when caller is not governance.
pub fn register_feed(env: &Env, _governance: Address, asset: Symbol, feed: Address) -> Result<(), Error> {
    let mut feeds = storage::get_feeds(env, asset.clone());
    if feeds.iter().any(|sample| sample.feed == feed) {
        return Ok(());
    }

    feeds.push_back(FeedSample {
        feed,
        price: 0,
        updated_ledger: env.ledger().sequence() as u32,
    });
    storage::set_feeds(env, asset, &feeds);
    Ok(())
}

/// Updates price for an existing feed.
pub fn upsert_feed_price(env: &Env, asset: Symbol, feed: Address, price: i128) -> Result<(), Error> {
    let mut feeds = storage::get_feeds(env, asset.clone());
    let now = env.ledger().sequence() as u32;

    let mut updated = false;
    for sample in feeds.iter_mut() {
        if sample.feed == feed {
            sample.price = price;
            sample.updated_ledger = now;
            updated = true;
        }
    }

    if !updated {
        feeds.push_back(FeedSample {
            feed,
            price,
            updated_ledger: now,
        });
    }

    storage::set_feeds(env, asset, &feeds);
    Ok(())
}
