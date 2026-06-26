#![cfg(test)]
extern crate std;

use crate::dutch_curve;

#[test]
fn discount_curve_respects_upper_bound() {
    let discount = dutch_curve::discount_bps(200, 100, 3_000);
    assert_eq!(discount, 3_000);
}
