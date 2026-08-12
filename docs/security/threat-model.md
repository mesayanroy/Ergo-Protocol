# 🛡️ Ergo Protocol: On-Chain Monitoring Plan & STRIDE Threat Model

> **Repository:** [https://github.com/mesayanroy/Ergo-Protocol](https://github.com/mesayanroy/Ergo-Protocol)  
> **Document Status:** Active Production Specification  
> **Target Network:** Stellar Mainnet (`public`) & Testnet (`testnet`)

---

## 1. Executive Summary & Security Philosophy

As a non-custodial money market operating on **Stellar / Soroban**, Ergo Protocol manages multi-asset collateralized debt positions ($XLM$, $USDC$, $EURC$, $ERGO$). The protocol employs a multi-layered defense strategy combining:
1. **On-Chain Safety Invariants:** Health factor constraints ($HF \ge 1.00$), reentrancy protection via checks-effects-interactions, and checked integer arithmetic.
2. **Dual-Oracle Pricing & Safety Circuit Breaker:** Ingests primary spot prices from **Reflector Oracle** with secondary fallback to **Soroswap DEX TWAP**, tripping an automated safety pause if price deviation exceeds 5% (500 bps).
3. **Soroban Rent & TTL Management:** Automated storage TTL extensions (`extend_ttl`) for instance and persistent keys to prevent state expiration under Protocol 20+ rules.
4. **24/7 Real-Time Event Monitoring & Off-Chain Keepers:** Continuous RPC event indexer (`getEvents`) tracking liquidations, collateral withdrawals, and oracle price staleness.

---

## 2. STRIDE Threat Modeling Framework

| Threat Category | Potential Risk Scenario | Protocol Mitigation & Soroban Defense | Status |
| :--- | :--- | :--- | :---: |
| **Spoofing** | Unauthorized user attempting to withdraw or borrow on behalf of another account. | Enforces native `user.require_auth()` on every state-mutating entry point (`deposit`, `borrow`, `withdraw`, `repay`). | **Mitigated ✅** |
| **Tampering** | Oracle price manipulation via flash loans or DEX spot price distortion. | **Dual-Oracle Aggregator (`CCZIMN...`):** Aggregates Reflector spot feeds + Soroswap TWAP. Trips 5% deviation circuit breaker if feeds diverge. Filters stale data (>300s). | **Mitigated ✅** |
| **Repudiation** | Disputes over collateral liquidation or health factor calculations. | Immutable Soroban RPC event logging (`env.events().publish(...)`). Every supply, borrow, auction bid, and debt settlement is recorded on the Stellar ledger. | **Mitigated ✅** |
| **Information Disclosure** | Exposure of private user addresses or permissioned pool allowlists. | Zero private user data stored on-chain. Compliance allowlists (`CBL5WK...`) contain only public Stellar G-addresses. | **Mitigated ✅** |
| **Denial of Service (DoS)** | Soroban storage expiration (TTL eviction) or keeper bot downtime during liquidations. | Storage keys execute `extend_ttl(50_000, 100_000)` on execution. Multi-region automated keeper bots stream RPC events for redundant Dutch auction triggers. | **Mitigated ✅** |
| **Elevation of Privilege** | Admin key compromise attempting to drain pool reserves or bypass compliance gates. | Admin functions protected by timelocked governance (`CBL5WK...`) and multi-sig key requirements. | **Mitigated ✅** |

---

## 3. On-Chain Real-Time Monitoring Specification

```
                               ┌────────────────────────────────┐
                               │     Soroban Mainnet RPC Node   │
                               │   https://mainnet.sorobanrpc   │
                               └───────────────┬────────────────┘
                                               │ (getEvents Stream)
                               ┌───────────────▼────────────────┐
                               │  Off-Chain Monitoring Indexer  │
                               │  (Node.js / TypeScript Daemon) │
                               └───────┬────────────────┬───────┘
                                       │                │
            ┌──────────────────────────┴───┐        ┌───┴──────────────────────────┐
            │ Health Factor Alert Monitor  │        │ Oracle Deviation Monitor     │
            │  (Triggers Dutch Auctions)   │        │ (Alerts on >5% Feed Variance) │
            └──────────────────────────────┘        └──────────────────────────────┘
```

### 3.1 Event Subscriptions & Monitoring Channels
- **Liquidation Warnings ($HF < 1.15$):** Indexer monitors `PositionUpdated` events and alerts keeper bots when borrower health factor approaches the 1.00 liquidation threshold.
- **Circuit Breaker Alerts:** Monitors `CircuitBreakerTripped` events from `OracleAggregatorContract`. Automatically notifies protocol administrators via Discord/Webhooks if Reflector and Soroswap prices diverge by >5%.
- **Soroban State TTL Monitoring:** Daily automated script queries `getLedgerEntries` for contract instance and persistent storage keys, flagging entries with TTL < 10,000 ledgers for rent replenishment.
