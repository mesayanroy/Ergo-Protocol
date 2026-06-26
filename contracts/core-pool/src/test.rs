#![cfg(test)]
extern crate std;

use crate::health_factor;

#[test]
fn health_factor_is_max_when_debt_zero() {
    let hf = health_factor::get_health_factor(10_000, 0).expect("must succeed");
    assert_eq!(hf, i128::MAX);
}

#[test]
fn health_factor_respects_ratio() {
    let hf = health_factor::get_health_factor(15_000, 10_000).expect("must succeed");
    assert_eq!(hf, 15_000);
}
