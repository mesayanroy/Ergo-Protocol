# Oracle Aggregator

Ergo Protocol uses a custom decentralized **Oracle Aggregator** designed to mitigate single-point-of-failure vulnerabilities in asset pricing. By aggregating pricing details across multiple independent data feeds (e.g., Reflector and Soroswap pools), the contract outputs a robust, deviation-resistant median price for all active markets.

---

## 1. Multi-Feed Median Calculation

The Oracle Aggregator queries `N` registered price feed contracts for a given asset. The price aggregation process follows these logical steps:

1. **Query**: The Aggregator queries each registered feed by invoking the `last_price(asset)` method.
2. **Staleness Filtering**: Prices that are older than `MAX_STALENESS_LEDGERS` (200 ledgers, approximately ~16 minutes) are discarded.
3. **Quorum Verification**: The Aggregator verifies that the number of fresh, non-zero prices meets the `MIN_FEED_QUORUM` (minimum of 2 feeds). If quorum is not met, the aggregator throws `Error::NoValidFeeds` and falls back to the last cached good price.
4. **Sorting & Median**: The remaining valid prices are sorted using a gas-efficient insertion sort algorithm. The median value is then chosen:
   - For odd $N$, the middle value.
   - For even $N$, the lower-middle index value.

---

## 2. Staleness Bounds (`MAX_STALENESS_LEDGERS`)

In Soroban, block time is measured in ledger sequences. 
- `MAX_STALENESS_LEDGERS` is set to **200 ledgers**.
- Since Stellar ledger close times average **4.5 to 5.0 seconds**, 200 ledgers correspond to approximately **15 to 17 minutes**.
- If a price feed fails to push updates within this window due to network congestion or source failures, its price is marked stale and excluded from the active median to prevent front-running or incorrect health factor calculations.

---

## 3. Circuit Breaker Deviation Halt

To protect the protocol from flash loan oracle manipulation or compromised feed sources, the Aggregator implements a real-time circuit breaker check:

- **Max Deviation Limit**: `MAX_DEVIATION_BPS` is set to **500 bps (5%)**.
- **Check**: For each active feed price, the deviation from the computed median is evaluated:
  $$\text{Deviation Bps} = \frac{|Price - Median|}{Median} \times 10,000$$
- **Halt**: If any feed's price deviates from the median by more than 500 bps, the Aggregator instantly trips the circuit breaker for that asset:
  1. The asset's `tripped` flag is committed in storage.
  2. Further pricing requests revert with `Error::CircuitBreakerTripped`.
  3. The core pool halts further borrowing or withdraws using that asset to freeze potential damage, while allowing deposits and repayments.

---

## 4. Governance Override

Once tripped, the circuit breaker remains active until governance resolves the feed discrepancy.
1. Governance creates a `ProposalType::OracleCircuitBreakerOverride` proposal.
2. The proposal outlines the updated list of healthy price feeds.
3. Upon approval and timelock expiration, the executor calls `override_with_new_feeds(governance, asset, new_feeds)`:
   - The tripped breaker is reset to `false`.
   - The old faulty feeds are replaced with the new, whitelisted feed list.
   - The contract resumes normal price evaluations.
