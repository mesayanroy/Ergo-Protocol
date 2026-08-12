# 💰 SCF Open Track Deliverables & Budget Breakdown: Ergo Protocol

> **Total Requested Budget:** $120,000 USD (denominated in XLM)  
> **Project Duration:** ~4 Months (August 2026 – December 2026)  
> **Track:** Open Track (Soroban Non-Custodial Money Market & Liquidity Layer)  
> **Current Network Status:** **Mainnet V1 Soft-Launch Live** (`CCGIBZCT...`) & **Testnet Live** (`CBHSTINK...`)  
> **ERGO Native Utility Token:** **Mainnet Deployed** (`CDILV5HT...`) & **Testnet Deployed** (`CDYJFYG7...`)  
> **Repository:** [https://github.com/mesayanroy/Ergo-Protocol](https://github.com/mesayanroy/Ergo-Protocol)

---

## 1. Budget Summary & Tranche Allocation ($120,000 Total)

| Tranche | Payout Trigger | Budget % | Amount (USD in XLM) | Primary Deliverables |
| :---: | :--- | :---: | :---: | :--- |
| **Tranche #0** | Award Approval & Acceptance | **10%** | **$12,000** | Initial architecture audit, Soroban state rent allocation, & spec finalization. |
| **Tranche #1** | Deliverable 1 Completion | **20%** | **$24,000** | Smart Contract Optimization, $ERGO Staking Logic, & Storage Rent Strategy. |
| **Tranche #2** | Deliverable 2 Completion | **30%** | **$36,000** | **On-Chain Monitoring & Threat Model**, Web Dashboard, Keepers, & Vault Seeding. |
| **Tranche #3** | Deliverable 3 Completion | **40%** | **$48,000** | Production Mainnet v2 Launch, On-Chain Traction Scaling, & Community ICO Framework. |

---

## 2. Exact Application Form Fields

### **Budget:**
`$120,000`

---

### **Tranche #1 Deliverables:**

1. **Smart Contract Optimization & WASM Refactoring ($10,000):**  
   Refactor and optimize Ergo Protocol's core Soroban smart contract suite (`core-pool`, `oracle-aggregator`, `liquidation-engine`, `backstop`, `compliance`, `governance`, `ergo-token`) on Testnet. Optimize WASM build sizes, enforce checked math operations (`checked_add`, `checked_mul`), and standardize asset decimal scaling across stablecoins (USDC/EURC) and native XLM.

2. **$ERGO Tokenomics & veERGO Staking Logic ($8,000):**  
   Integrate the native $ERGO token contract (`CDYJFYG7...` on Testnet, `CDILV5HT...` on Mainnet) into the core pool for automated liquidity mining emissions and vote-escrowed governance (veERGO) staking calculations.

3. **Soroban Storage Rent & TTL Management Strategy ($6,000):**  
   Implement explicit Soroban state rent management across Instance (`instance().extend_ttl`), Persistent (`persistent().extend_ttl`), and Temporary storage keys to guarantee long-term state retention under Protocol 20+ rules.

- **How to Measure Completion:**  
  - 100% of Rust WASM contracts refactored, optimized, and re-deployed on **Stellar Testnet** (Core Pool: `CBHSTINK374ABHBJ7MK347ICJ6JKVSTD72Y5BGZN5V6BJGLNKYYFEI3O`, ERGO Token: `CDYJFYG7X4DPMAOQUUTYEK5KAOSTI7LEG4VDVSZ6KZQFM66LFHSLVBLZ`).
  - Unit test suite achieving **>90% branch coverage** across all modules (`cargo test`).
  - Minimum **450+ verified Testnet transactions** across at least 15 unique testnet wallet addresses verified on StellarExpert.

### **Tranche #1 Completion Date:**
`28/09/2026`

---

### **Tranche #2 Deliverables:**

1. **On-Chain Monitoring Plan & STRIDE Threat Model ($8,000):**  
   Publish a comprehensive On-Chain Monitoring Specification and STRIDE Threat Model document (`docs/security/threat-model.md`). The plan details real-time event indexing via Soroban RPC `getEvents`, automated alerting for price feed anomalies, circuit breaker triggers (5% oracle deviation threshold), reentrancy check-effects-interactions verification, and automated storage TTL rent monitoring.

2. **Production Web Client & Wallet Integration ($12,000):**  
   Complete the Next.js 14 web client (`client/`) with real-time Health Factor ($HF$) simulation meters, $ERGO reward claiming UI, and full Stellar Wallet Kit support (Freighter, Albedo, Lobstr) connecting directly to `https://mainnet.sorobanrpc.com`.

3. **24/7 Automated Dutch Auction Keeper Bot Service ($10,000):**  
   Build and deploy Node.js/TypeScript off-chain keeper bot infrastructure (`server/` & `keepers/`) streaming RPC ledger events to automatically trigger Dutch Auction liquidations whenever a borrower position falls below $HF < 1.00$.

4. **Protocol Treasury Vault Seed Liquidity ($6,000):**  
   Deposit seed liquidity into the Core Pool and Backstop insurance reserve to guarantee active borrow capacity on launch day.

- **How to Measure Completion:**  
  - Published On-Chain Monitoring Plan & Threat Model document in repository.
  - Production Web UI live with interactive position simulation and wallet support.
  - Automated keeper bots operating 24/7 with verified automated liquidation executions on testnet.
  - Initial treasury vault liquidity deposited into protocol contracts.
  - Passage of SDF professional user testing and completion of SDF security audit credit review.

### **Tranche #2 Completion Date:**
`15/11/2026`

---

### **Tranche #3 Deliverables:**

1. **Production Mainnet v2 Smart Contract Launch ($20,000):**  
   Execute final production deployment of upgraded WASM binaries to Stellar Mainnet (`public`), building upon our active Mainnet v1 soft-launch (`CCGIBZCTJQV5ENURT6YKGZ34VVGELBR2O2NUCZED2DDMV4T7FWMJMFKK`). Activate decentralized timelocked governance voting via veERGO.

2. **Production Dual-Oracle Integration & Circuit Breaker Verification ($12,000):**  
   Connect production price feeds (Reflector Oracle spot prices + Soroswap DEX TWAP) with active 5% deviation circuit breakers.

3. **Mainnet Traction Scaling & Community ICO Technical Readiness ($16,000):**  
   Scale active mainnet borrowers and lenders. Publish open-source SDK documentation, API indexers, and complete smart contract and legal readiness for our post-launch Community ICO / Public Token Sale on Soroban DEX pools.

- **How to Measure Completion:**  
  - Production WASM smart contracts live on Stellar Mainnet.
  - Minimum **350+ verified Mainnet transactions** and **30+ unique active mainnet wallet users** interacting with the protocol (scaling up from our current 153 mainnet soft-launch transactions and 8 active mainnet wallets).
  - Open-source SDK documentation, API indexers, and $ERGO Community ICO token launch framework published.

### **Tranche #3 Completion Date:**
`22/12/2026`
