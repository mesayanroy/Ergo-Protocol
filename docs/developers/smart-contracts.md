# 🦀 Smart Contracts Engineering Guide

Ergo Protocol's contracts are implemented in Rust using the Soroban Smart Contract SDK.

## Key Design Considerations

- **Gas Optimization**: Minimized storage footprint via temporary and persistent keys.
- **Reentrancy Protection**: Strict check-effects-interactions pattern across all transfer entrypoints.
- **Contract Upgradability**: Uses standard Soroban WASM hash upgrades triggered via Governance.
