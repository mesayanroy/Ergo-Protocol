# Testnet Deployment Guide

This guide details how to compile and deploy the 6 core contracts of Ergo Protocol to Stellar Testnet.

---

## Prerequisites
1. Install Stellar CLI:
   ```bash
   cargo install --locked stellar-cli --features opt
   ```
2. Generate an admin keypair and fund it on Testnet:
   ```bash
   stellar keys generate --network testnet admin
   ```

---

## 1. Build Smart Contracts
Compile each contract to targeting optimized WebAssembly:
```bash
# Build all contracts from the root folder
cd contracts
for dir in oracle-aggregator backstop compliance core-pool liquidation-engine governance; do
  cd $dir
  stellar contract build
  cd ..
done
```

This compiles optimized WASM binaries to `target/wasm32-unknown-unknown/release/*.wasm`.

---

## 2. Programmatic Deployment Sequence

To deploy the contracts in correct dependency order, run:

```bash
# Deploys Oracle Aggregator
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/oracle_aggregator.wasm \
  --source admin \
  --network testnet \
  --alias oracle_aggregator

# Deploys Backstop
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/backstop.wasm \
  --source admin \
  --network testnet \
  --alias backstop

# Deploys Compliance
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/compliance.wasm \
  --source admin \
  --network testnet \
  --alias compliance

# Deploys Core Pool
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/core_pool.wasm \
  --source admin \
  --network testnet \
  --alias core_pool

# Deploys Liquidation Engine
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/liquidation_engine.wasm \
  --source admin \
  --network testnet \
  --alias liquidation_engine

# Deploys Governance
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/governance.wasm \
  --source admin \
  --network testnet \
  --alias governance
```

---

## 3. Initialization Commands

### Step A: Initialize Core Pool
```bash
stellar contract invoke --id <CORE_POOL_CONTRACT_ID> --source admin \
  --network testnet -- initialize \
  --admin <ADMIN_PUBLIC_KEY> \
  --oracle <ORACLE_AGGREGATOR_CONTRACT_ID> \
  --backstop <BACKSTOP_CONTRACT_ID> \
  --compliance <COMPLIANCE_CONTRACT_ID>
```

### Step B: Initialize Liquidation Engine
```bash
stellar contract invoke --id <LIQUIDATION_ENGINE_CONTRACT_ID> --source admin \
  --network testnet -- initialize \
  --admin <ADMIN_PUBLIC_KEY> \
  --core_pool <CORE_POOL_CONTRACT_ID> \
  --backstop <BACKSTOP_CONTRACT_ID>
```

### Step C: Initialize Governance
```bash
stellar contract invoke --id <GOVERNANCE_CONTRACT_ID> --source admin \
  --network testnet -- initialize \
  --admin <ADMIN_PUBLIC_KEY> \
  --core_pool <CORE_POOL_CONTRACT_ID> \
  --oracle <ORACLE_AGGREGATOR_CONTRACT_ID> \
  --backstop <BACKSTOP_CONTRACT_ID> \
  --liquidation_engine <LIQUIDATION_ENGINE_CONTRACT_ID> \
  --compliance <COMPLIANCE_CONTRACT_ID>
```

### Step D: Register Whitelists in Governance
Whitelist operations that governance can execute:
```bash
stellar contract invoke --id <GOVERNANCE_CONTRACT_ID> --source admin \
  --network testnet -- register_whitelist \
  --contract <CORE_POOL_CONTRACT_ID> --function "pause_market"

stellar contract invoke --id <GOVERNANCE_CONTRACT_ID> --source admin \
  --network testnet -- register_whitelist \
  --contract <ORACLE_AGGREGATOR_CONTRACT_ID> --function "register_feed"
```
