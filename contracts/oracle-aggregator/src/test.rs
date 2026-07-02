#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env, Vec, symbol_short, Symbol, contract, contractimpl};
use crate::{aggregate, storage, errors::Error};

#[contract]
pub struct MockFeed;

#[contractimpl]
impl MockFeed {
    pub fn last_price(env: Env, _asset: Symbol) -> (i128, u64) {
        let price = env.storage().instance().get(&symbol_short!("price")).unwrap_or(0i128);
        let time = env.storage().instance().get(&symbol_short!("time")).unwrap_or(0u64);
        (price, time)
    }

    pub fn set_price(env: Env, price: i128, time: u64) {
        env.storage().instance().set(&symbol_short!("price"), &price);
        env.storage().instance().set(&symbol_short!("time"), &time);
    }
}

#[test]
fn test_normal_median() {
    let env = Env::default();
    env.mock_all_auths();

    let asset = symbol_short!("XLM");
    let admin = Address::generate(&env);
    storage::set_admin(&env, &admin);

    let mut feeds = Vec::new(&env);
    
    // Create 3 feeds
    for val in [100i128, 105i128, 95i128] {
        let feed_addr = env.register_contract(None, MockFeed);
        let client = MockFeedClient::new(&env, &feed_addr);
        client.set_price(&val, &env.ledger().timestamp());
        feeds.push_back(feed_addr);
    }

    storage::set_feeds(&env, asset.clone(), &feeds);

    let price = aggregate::get_price(&env, asset).unwrap();
    assert_eq!(price, 100);
}

#[test]
fn test_one_feed_stale() {
    let env = Env::default();
    let asset = symbol_short!("XLM");
    let admin = Address::generate(&env);
    storage::set_admin(&env, &admin);

    let mut feeds = Vec::new(&env);
    
    // Feed 1: fresh
    let f1 = env.register_contract(None, MockFeed);
    MockFeedClient::new(&env, &f1).set_price(&100, &env.ledger().timestamp());
    feeds.push_back(f1);

    // Feed 2: stale (600 seconds ago)
    let f2 = env.register_contract(None, MockFeed);
    MockFeedClient::new(&env, &f2).set_price(&200, &(env.ledger().timestamp() - 600));
    feeds.push_back(f2);

    storage::set_feeds(&env, asset.clone(), &feeds);

    // Should only use the fresh feed (100) and ignore the stale feed (200)
    let price = aggregate::get_price(&env, asset).unwrap();
    assert_eq!(price, 100);
}

#[test]
fn test_all_feeds_dark() {
    let env = Env::default();
    let asset = symbol_short!("XLM");
    let admin = Address::generate(&env);
    storage::set_admin(&env, &admin);

    let mut feeds = Vec::new(&env);
    let f1 = env.register_contract(None, MockFeed);
    MockFeedClient::new(&env, &f1).set_price(&100, &(env.ledger().timestamp() - 600));
    feeds.push_back(f1);

    storage::set_feeds(&env, asset.clone(), &feeds);

    assert_eq!(aggregate::get_price(&env, asset).unwrap_err(), Error::NoValidFeeds);
}

#[test]
fn test_deviation_trip() {
    let env = Env::default();
    let asset = symbol_short!("XLM");
    let admin = Address::generate(&env);
    storage::set_admin(&env, &admin);

    let mut feeds = Vec::new(&env);
    
    // Median is around 100.
    // Feed 1: 100
    let f1 = env.register_contract(None, MockFeed);
    MockFeedClient::new(&env, &f1).set_price(&100, &env.ledger().timestamp());
    feeds.push_back(f1);

    // Feed 2: 130 (deviates by 30%, which is > MAX_DEVIATION_BPS=20%)
    let f2 = env.register_contract(None, MockFeed);
    MockFeedClient::new(&env, &f2).set_price(&130, &env.ledger().timestamp());
    feeds.push_back(f2);

    storage::set_feeds(&env, asset.clone(), &feeds);

    // Should fail and trip circuit breaker
    assert_eq!(aggregate::get_price(&env, asset.clone()).unwrap_err(), Error::FeedDeviated);
    assert!(storage::is_tripped(&env, asset));
}
