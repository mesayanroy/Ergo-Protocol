# 🔮 Dual-Oracle Pricing & Aggregator System

Ergo Protocol utilizes a robust, decentralized oracle aggregator system designed to eliminate single-point-of-failure vulnerabilities in asset pricing.

## Features

- **Decimals Normalization**: Normalizes all asset prices to 7 decimal places for consistency inside lending pool calculations.
- **Failover Logic**: Leverages Reflector CEX/DEX feeds as the primary data source and falls back to Soroswap TWAP DEX feeds if primary feeds are stale.
- **Circuit Breakers**: Reverts execution if price feeds deviate by more than 5% within a single block or if feed data is older than 20 minutes.
