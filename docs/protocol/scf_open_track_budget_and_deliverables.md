# 💰 SCF Open Track Deliverables & Budget Breakdown: Ergo Protocol

> **Total Requested Budget:** $65,000 USD (denominated in XLM)  
> **Project Duration:** ~4 Months (August 2026 – December 2026)  
> **Current Network Status:** **Mainnet V1 Soft-Launch Live** (`CCGIBZCT...`) & **Testnet Live** (`CBHSTINK...`)  
> **Repository:** [https://github.com/mesayanroy/Ergo-Protocol](https://github.com/mesayanroy/Ergo-Protocol)

---

## 1. Budgeting Rules & Current Deployment Status

### **Current Mainnet & Testnet Status Statement**
Ergo Protocol has already completed its **v1 Mainnet Soft-Launch** on Stellar (`public`), with all 6 core smart contracts deployed and verified on-chain (**153 Mainnet transactions across 8 active wallets**, **318 Testnet transactions**). 

This grant will fund the transition from **Mainnet v1 Soft-Launch** to full **Production Mainnet v2 Public Launch**, covering core contract optimization, automated keeper infrastructure, treasury seed liquidity, and scaling user traction.

### **Developer Salary & Expense Confirmation**
**Developer salaries are 100% allowed and expected.** Core engineering compensation for smart contract refactoring, Soroban state rent management, keeper bot building, SDK integration, and frontend engineering is the primary allowed expense under SCF Build Award rules.

---

## 2. Funding Tranche Summary

| Tranche | Trigger / Timing | Budget % | Amount (USD in XLM) | Focus Deliverables |
| :---: | :--- | :---: | :---: | :--- |
| **Tranche #0** | Upon Approval | **10%** | **$6,500** | Initial setup, technical specification, & contract architecture audit. |
| **Tranche #1** | Milestone 1 Completion | **20%** | **$13,000** | Testnet Contract Refactoring, Vault Fixes, & E-Mode Enhancements. |
| **Tranche #2** | Milestone 2 Completion | **30%** | **$19,500** | Web UI Integration, Dutch Auction Keepers, & Treasury Vault Seeding. |
| **Tranche #3** | Milestone 3 (Official Mainnet Public Launch) | **40%** | **$26,000** | Full Production Mainnet v2 Launch, User Traction, & SDF User Testing. |

---

## 3. Detailed Milestone Deliverables (For SCF Application Form)

### **[Deliverable 1] Smart Contract Optimization, Dual-Oracle Safety & Testnet Refactoring**
- **Target Date:** September 25, 2026
- **Budget:** $13,000 (Tranche #1)
- **Brief Description:**  
  Refactor and optimize Ergo Protocol's core Soroban smart contract suite (`core-pool`, `oracle-aggregator`, `liquidation-engine`, `backstop`, `compliance`, `governance`) building upon our active Testnet and Mainnet v1 deployments. Implement storage rent optimizations (`extend_ttl`) to ensure long-term Soroban state retention under Protocol 20+ rules. Standardize asset decimal scaling for stablecoins (USDC/EURC) and native XLM. Enhance the dual-oracle fallback mechanism between Reflector spot feeds and Soroswap DEX TWAP with an automated 5% deviation circuit breaker.
- **How to Measure Completion:**  
  - 100% of Rust WASM smart contracts refactored, optimized, and re-deployed on **Stellar Testnet** (Core Pool: `CBHSTINK374ABHBJ7MK347ICJ6JKVSTD72Y5BGZN5V6BJGLNKYYFEI3O`).
  - Unit test suite achieving >90% branch coverage across all contract modules (`cargo test`).
  - Minimum **400+ verified Testnet transactions** across at least 15 unique testnet wallet addresses verified on StellarExpert.

---

### **[Deliverable 2] Production Web App, Keeper Infrastructure & Treasury Vault Seeding**
- **Target Date:** November 10, 2026
- **Budget:** $19,500 (Tranche #2)
- **Brief Description:**  
  Complete the production Next.js 14 web client (`client/`) integrated with Stellar Wallet Kit (supporting Freighter, Albedo, Lobstr) and direct `@stellar/stellar-sdk` RPC connection (`mainnet.sorobanrpc.com`). Build and deploy automated off-chain keeper bot infrastructure (`server/` & `keepers/`) that streams Soroban RPC events (`getEvents`) to monitor position Health Factors ($HF$) and automatically trigger Dutch Auction liquidations when $HF < 1.00$. Seed initial protocol treasury vault liquidity into the Core Pool and Backstop insurance layer to enable immediate borrowing capability on public launch day.
- **How to Measure Completion:**  
  - Web application live with interactive position simulation, health factor meters, and one-click supply/borrow UX.
  - Automated liquidation keeper bots running 24/7 with verified automated Dutch auction triggers on testnet.
  - Initial treasury vault liquidity deposited into protocol contracts (`USDC`, `EURC`, `XLM` liquidity pools).
  - Passage of SDF professional user testing and completion of SDF security audit credit review.

---

### **[Deliverable 3] Official Production Mainnet v2 Launch & Scaling User Traction**
- **Target Date:** December 20, 2026
- **Budget:** $26,000 (Tranche #3)
- **Brief Description:**  
  Execute the **Official Production Mainnet v2 Public Launch** on Stellar Mainnet (`public` network), building upon our current Mainnet v1 soft-launch (`CCGIBZCTJQV5ENURT6YKGZ34VVGELBR2O2NUCZED2DDMV4T7FWMJMFKK`). Redeploy upgraded production WASM binaries, launch the decentralized governance portal for community parameter voting, and connect production oracle feeds (Reflector & Soroswap TWAP). Scale real user onboarding, demonstrating sustained liquidity growth and active mainnet borrow positions.
- **How to Measure Completion:**  
  - Upgraded Production WASM contracts live on Stellar Mainnet.
  - Minimum **300+ verified Mainnet transactions** and **25+ unique active mainnet wallet users** interacting with the protocol (building on our current 153 mainnet soft-launch transactions and 8 active mainnet wallets).
  - Open-source SDK documentation, API indexers, and live monitoring dashboards published for community integration.
