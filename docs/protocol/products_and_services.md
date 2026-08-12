# 🚀 Ergo Protocol: Products & Services (SCF Grant Submission)

---

### **1. Shared Core Liquidity Pool (`core-pool`)**
- **Feature Description:** Non-custodial money market pooling native Lumens (XLM) and stablecoins (USDC, EURC), allowing lenders to earn passive supply yield and borrowers to draw instant liquidity against collateral.
- **How Stellar is Used:** Built as a Soroban WASM contract (`CCGIBZ...`) interfacing directly with Stellar Asset Contracts (SACs) via `token::Client`. Position accounting and interest indices use Soroban persistent storage with automated TTL extension (`extend_ttl`).
- **Impact on Project:** Maximizes capital efficiency on Stellar, offering sub-5-second transaction finality, micro-cent gas fees, and instant non-custodial liquidity for ecosystem users.

---

### **2. Correlated Asset Efficiency Mode (E-Mode)**
- **Feature Description:** Specialized risk configuration for pegged/correlated asset pairs (e.g., USDC / EURC) boosting maximum borrowing power up to **90% Loan-to-Value (LTV)**.
- **How Stellar is Used:** Computed natively within the `core-pool` WASM contract using real-time price feeds from Stellar oracle feeds.
- **Impact on Project:** Unlocks high-leverage stablecoin arbitrage and foreign exchange trading on Stellar, driving higher DEX trading volume and protocol TVL.

---

### **3. Dual-Oracle Pricing & Safety Circuit Breaker (`oracle-aggregator`)**
- **Feature Description:** Price aggregation layer fetching primary spot prices from **Reflector Oracle** with fallback to **Soroswap DEX TWAP**, enforcing an automated 5% price deviation trip.
- **How Stellar is Used:** Deployed as a Soroban contract (`CCZIMN...`) that normalizes native Stellar asset prices to 7 decimals and filters stale data (>300s).
- **Impact on Project:** Protects protocol solvency against price manipulation, oracle outages, and false liquidations, giving institutional lenders enterprise-grade security.

---

### **4. Dutch Auction Liquidation Engine (`liquidation-engine`)**
- **Feature Description:** Smooth linear-discount auction mechanism for liquidating undercollateralized positions ($HF < 1.00$) without market cascading.
- **How Stellar is Used:** Soroban contract (`CBGWB7...`) integrated with off-chain Node.js keeper bots streaming Soroban RPC ledger events (`getEvents`).
- **Impact on Project:** Eliminates sudden price crashes on Soroban DEX pools during liquidation events, protecting protocol solvency while guaranteeing liquidator profitability.

---

### **5. Native $ERGO Utility & Governance Token (`ergo-token`)**
- **Feature Description:** Native protocol token powering vote-escrowed governance (veERGO), liquidity mining rewards, Dutch auction fee discounts, and post-launch Community ICO token distribution.
- **How Stellar is Used:** Deployed as a Soroban WASM token contract on Stellar Mainnet (`CDILV5HTHZGWQYRL6TJP3MUTSCRXXQSAUHBMASXPZVC2BS4I3QUE5IDQ`) and Testnet (`CDYJFYG7X4DPMAOQUUTYEK5KAOSTI7LEG4VDVSZ6KZQFM66LFHSLVBLZ`) with classic issuer (`GB7NRH4HKV3WAVUM7ZYNMP7BSWHYIOI4KQTCZKFB6CJWK7WXL7GHNQLB`).
- **Impact on Project:** Decentralizes protocol governance, aligns long-term liquidity providers, and establishes a clear path for protocol self-sustainability through a future community ICO.

---

### **6. Backstop Insurance Shortfall Reserve (`backstop`)**
- **Feature Description:** First-loss capital insurance layer that absorbs bad debt shortfalls during extreme black-swan market volatility.
- **How Stellar is Used:** Soroban contract (`CBHFJX...`) managing pooled LP stake reserves, auto-settling deficits when liquidation auctions complete with leftover debt.
- **Impact on Project:** Guarantees 100% solvency for lenders even during severe market downturns, building user trust and attracting institutional liquidity.

---

### **7. Compliance Gate & Permissioned Satellite Pools (`compliance`)**
- **Feature Description:** Optional access control layer providing KYC/AML allowlist verification for institutional satellite liquidity pools.
- **How Stellar is Used:** Soroban contract (`CBL5WK...`) validating user addresses against on-chain permission vectors prior to approving `deposit` or `borrow` calls.
- **Impact on Project:** Opens Stellar DeFi to compliant institutions, fintech anchors, and enterprise capital that require regulatory compliance safeguards.

---

### **8. Non-Custodial Web Dashboard & Wallet Kit (`client/`)**
- **Feature Description:** Responsive Next.js 14 web client providing real-time Health Factor simulation, $ERGO staking management, and one-click supply/borrow actions.
- **How Stellar is Used:** Integrates Stellar Wallet Kit (Freighter, Albedo, Lobstr) and `@stellar/stellar-sdk` communicating directly with `https://mainnet.sorobanrpc.com`.
- **Impact on Project:** Delivers a seamless, mobile-friendly UX for retail and institutional users, driving verified mainnet traction (**153 mainnet transactions across 8 active wallets**).
