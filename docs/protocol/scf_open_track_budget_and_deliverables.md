# 💰 SCF Open Track Deliverables & Budget Breakdown: Ergo Protocol

> **Total Requested Budget:** $65,000 USD (denominated in XLM)  
> **Project Duration:** ~4 Months (August 2026 – December 2026)  
> **Repository:** [https://github.com/mesayanroy/Ergo-Protocol](https://github.com/mesayanroy/Ergo-Protocol)

---

## 1. Budgeting Rules & Developer Salary Confirmation

### **Can Developer Salaries Be Included?**
**YES, absolutely.** Core engineering and developer compensation for protocol development, Soroban contract optimization, keeper bot building, SDK integration, and frontend engineering is the **primary allowed and expected expense** in the SCF Build Award.

### **Budget Allocation Strategy ($65,000 Total):**
1. **Core Developer Engineering Salary (~60% / $39,000):** Compensation for 2 full-stack Soroban/Rust smart contract engineers & frontend developers over the 4-month timeline.
2. **Protocol Treasury Vault & Initial Liquidity Bootstrapping (~25% / $16,250):** Seeding initial borrow liquidity into the Mainnet Core Pool (`USDC`, `EURC`, `XLM`) and Backstop Insurance Pool so early mainnet borrowers can take loans immediately.
3. **Soroban State Rent, Contract Re-deployments & Infra (~15% / $9,750):** RPC node infrastructure, automated keeper bot hosting, Soroban storage TTL extension rent management, and contract fixes/re-deployments across Testnet and Mainnet.

*Note: Marketing expenses are 0% (excluded per SCF rules). Security audit costs are 0% (funded directly via SDF Audit Credits in Tranche #3).*

---

## 2. Funding Tranche Summary

| Tranche | Trigger / Timing | Budget % | Amount (USD in XLM) | Focus Deliverables |
| :---: | :--- | :---: | :---: | :--- |
| **Tranche #0** | Upon Approval | **10%** | **$6,500** | Initial setup, technical specification, and repository audit. |
| **Tranche #1** | Milestone 1 Completion | **20%** | **$13,000** | Testnet Contract Refactoring, Vault Fixes, & E-Mode Enhancements. |
| **Tranche #2** | Milestone 2 Completion | **30%** | **$19,500** | Web UI Integration, Dutch Auction Keepers, & Treasury Vault Seeding. |
| **Tranche #3** | Milestone 3 (Mainnet Launch) | **40%** | **$26,000** | Full Mainnet Production Launch, Verified User Traction, & SDF User Testing. |

---

## 3. Detailed Milestone Deliverables (For SCF Application Form)

### **[Deliverable 1] Architecture Finalization, Contract Refactoring & Testnet Optimization**
- **Target Date:** September 25, 2026
- **Budget:** $13,000 (Tranche #1)
- **Brief Description:**  
  Refactor and optimize Ergo Protocol's core Soroban smart contract suite (`core-pool`, `oracle-aggregator`, `liquidation-engine`, `backstop`, `compliance`, `governance`) on Testnet. Implement storage rent optimizations (`extend_ttl`) to ensure long-term Soroban state retention under Protocol 20+ rules. Fix asset decimal scaling for stablecoins (USDC/EURC) and native XLM. Enhance the dual-oracle fallback mechanism between Reflector spot feeds and Soroswap DEX TWAP with an automated 5% deviation trip.
- **How to Measure Completion:**  
  - 100% of Rust WASM smart contracts compiled, optimized, and re-deployed on **Stellar Testnet** (Core Pool: `CBHSTINK374ABHBJ7MK347ICJ6JKVSTD72Y5BGZN5V6BJGLNKYYFEI3O`).
  - Unit test suite achieving >90% branch coverage across all contract modules (`cargo test`).
  - Minimum **400+ verified Testnet transactions** across at least 15 unique testnet wallet addresses verified on StellarExpert.

---

### **[Deliverable 2] Web Dashboard, Keeper Bot Service & Treasury Vault Bootstrapping**
- **Target Date:** November 10, 2026
- **Budget:** $19,500 (Tranche #2)
- **Brief Description:**  
  Complete the production Next.js 14 web client (`client/`) integrated with Stellar Wallet Kit (supporting Freighter, Albedo, Lobstr) and direct `@stellar/stellar-sdk` RPC connection (`mainnet.sorobanrpc.com`). Build and deploy automated off-chain keeper bot infrastructure (`server/` & `keepers/`) that streams Soroban RPC events (`getEvents`) to monitor position Health Factors ($HF$) and automatically trigger Dutch Auction liquidations when $HF < 1.00$. Seed initial protocol treasury vault liquidity into the Core Pool and Backstop insurance layer to enable immediate borrowing capability on launch.
- **How to Measure Completion:**  
  - Web application live with interactive position simulation, health factor meters, and one-click supply/borrow UX.
  - Automated liquidation keeper bots running 24/7 with verified automated Dutch auction triggers on testnet.
  - Initial treasury vault liquidity deposited into protocol contracts (`USDC`, `EURC`, `XLM` liquidity pools).
  - Passage of SDF professional user testing and completion of SDF security audit credit review.

---

### **[Deliverable 3] Mainnet Production Launch, Contract Redeployment & User Traction**
- **Target Date:** December 20, 2026
- **Budget:** $26,000 (Tranche #3)
- **Brief Description:**  
  Execute final production smart contract deployment to **Stellar Mainnet** (`public` network). Launch production web app and governance portal, enabling community asset onboarding, timelocked parameter adjustments, and decentralized risk management. Transition protocol dependencies to verified production oracles (Reflector & Soroswap TWAP). Onboard active retail and institutional borrowers, demonstrating sustained on-chain liquidity and transaction growth.
- **How to Measure Completion:**  
  - All 6 core WASM contracts live on Stellar Mainnet (Core Pool: `CCGIBZCTJQV5ENURT6YKGZ34VVGELBR2O2NUCZED2DDMV4T7FWMJMFKK`).
  - Minimum **300+ verified Mainnet transactions** and **25+ unique active mainnet wallet users** interacting with the protocol (building on our current 153 mainnet transactions and 8 active wallets).
  - Open-source SDK documentation, API indexers, and live monitoring dashboards published for community integration.
