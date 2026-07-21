# 🏛️ Ergo Protocol System Architecture

Ergo Protocol implements a high-performance decentralized lending and borrowing framework natively on Stellar/Soroban. The system is designed around a core pool that aggregates highly liquid assets, flanked by permissioned satellite pools and risk-management engines.

## Core Components

1. **Shared Core Pool (`core-pool`)**: Aggregates base assets (USDC, EURC, XLM) to maximize liquidity efficiency.
2. **Oracle Aggregator (`oracle-aggregator`)**: Standardizes asset price feeds from CEX/DEX sources with automated failover and safety circuit breakers.
3. **Liquidation Engine (`liquidation-engine`)**: Monitors pool health and manages collateral liquidations via Dutch curve auctions.
4. **Compliance Gate (`compliance`)**: Implements strict allowlist verification for permissioned markets.
5. **Backstop Pool (`backstop`)**: Acts as the protocol's insurance layer to absorb bad debt.
6. **Governance (`governance`)**: Orchestrates upgrades, fee updates, and new market registrations.

```
                  ┌──────────────────────┐
                  │   Oracle Aggregator  │
                  └──────────▲───────────┘
                             │ (Prices)
┌───────────┐     ┌──────────┴───────────┐     ┌─────────────┐
│  Wallet   ├────►│   Shared Core Pool   ◄─────┤ Compliance  │
└───────────┘     └──────────▲───────────┘     └─────────────┘
                             │ (Audit/Liquidate)
                  ┌──────────▼───────────┐     ┌─────────────┐
                  │  Liquidation Engine  ├────►│  Backstop   │
                  └──────────────────────┘     └─────────────┘
```
