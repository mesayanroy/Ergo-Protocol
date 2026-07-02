use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::storage;

/// Registers a feed for an asset under governance authorization.
///
/// Failure conditions:
/// - Returns `Error::Unauthorized` when governance address does not match admin.
pub fn register_feed(env: &Env, governance: Address, asset: Symbol, feed: Address) -> Result<(), Error> {
    governance.require_auth();
    let admin = storage::get_admin(env).ok_or(Error::Unauthorized)?;
    if governance != admin {
        return Err(Error::Unauthorized);
    }

    let mut feeds = storage::get_feeds(env, asset.clone());
    for f in feeds.iter() {
        if f == feed {
            return Ok(());
        }
    }

    feeds.push_back(feed);
    storage::set_feeds(env, asset, &feeds);
    Ok(())
}

pub fn list_feeds(env: &Env, asset: Symbol) -> Vec<Address> {
    storage::get_feeds(env, asset)
}
