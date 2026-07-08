"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Moon, Sun, BookOpen, ChevronRight, Terminal, CheckCircle2, ShieldAlert } from "lucide-react";

// Structure for docs content
interface DocSection {
  category: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
  toc: { label: string; id: string }[];
}

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<string>("quickstart");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searchQuery, setSearchQuery] = useState("");

  // Docs Categories and Pages mapping
  const menu = [
    {
      group: "Start",
      items: [
        { label: "Welcome", slug: "welcome" },
        { label: "Quick Start", slug: "quickstart" },
      ],
    },
    {
      group: "Concepts",
      items: [
        { label: "Architecture", slug: "architecture" },
        { label: "Markets & Assets", slug: "markets" },
        { label: "Compliance Layer", slug: "compliance" },
        { label: "Risk & Liquidations", slug: "risk" },
      ],
    },
    {
      group: "Smart Contracts",
      items: [
        { label: "Core Pool", slug: "core-pool" },
        { label: "Backstop Manager", slug: "backstop" },
        { label: "Oracle Aggregator", slug: "oracle" },
      ],
    },
    {
      group: "REST API",
      items: [
        { label: "API Reference", slug: "api-ref" },
      ],
    },
  ];

  // Document definitions
  const docsData: Record<string, DocSection> = {
    welcome: {
      category: "Start",
      title: "Welcome to Ergo Protocol",
      subtitle: "Next-generation capital efficiency and compliance-modular lending on Stellar",
      toc: [
        { label: "Introduction", id: "intro" },
        { label: "Core Features", id: "features" },
        { label: "System Design", id: "design" },
      ],
      content: (
        <div className="flex flex-col gap-6">
          <section id="intro">
            <h2 className="text-xl font-bold mb-3">Introduction</h2>
            <p className="leading-relaxed mb-4">
              Ergo Protocol is a decentralized non-custodial liquidity market protocol built on the Stellar network. It enables users to easily supply assets to yield-generating pools, borrow against supplied collateral, delegate credit limits to partner accounts, and execute compliance-gated institutional transfers.
            </p>
            <p className="leading-relaxed text-sm">
              By combining a unified **Shared Liquidity Core** with isolated, high-risk **Satellite Pools**, Ergo maximizes the utility of mainstream capital while protecting the system from cascading defaults.
            </p>
          </section>

          <section id="features">
            <h2 className="text-xl font-bold mb-3">Core Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                <h4 className="font-bold mb-1 flex items-center gap-2"><BookOpen className="size-4 text-blue-500" /> Capital Optimization</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Assets in the Shared Core are pooled together, ensuring low lending interest rates and highly stable yields.</p>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                <h4 className="font-bold mb-1 flex items-center gap-2"><Terminal className="size-4 text-emerald-500" /> Credit Delegation</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lenders can delegate their borrow limits to trusted third-parties on-chain, earning additional delegation premium.</p>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                <h4 className="font-bold mb-1 flex items-center gap-2"><ShieldAlert className="size-4 text-amber-500" /> Compliance Modularity</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Built-in permissioned flags enable issuers of assets like EURC or institutional USDC to enforce clawbacks and allowlists.</p>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                <h4 className="font-bold mb-1 flex items-center gap-2"><CheckCircle2 className="size-4 text-purple-500" /> Backstop Insurance</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">A dedicated USDC insurance backstop covers pool shortfalls in worst-case liquidation scenarios.</p>
              </div>
            </div>
          </section>

          <section id="design">
            <h2 className="text-xl font-bold mb-3">System Design</h2>
            <p className="leading-relaxed">
              Ergo Protocol is implemented as a set of highly optimized Rust-based Soroban smart contracts. They enforce capital boundaries at the VM-level, ensuring that high-risk assets isolated in Satellite Pools cannot drain the primary liquidity reserves of the Shared Core.
            </p>
          </section>
        </div>
      ),
    },
    quickstart: {
      category: "Start",
      title: "Quick Start",
      subtitle: "From zero to executing lending transactions in under 10 minutes",
      toc: [
        { label: "Prerequisites", id: "prerequisites" },
        { label: "Step 1 — Connect Wallet", id: "step1" },
        { label: "Step 2 — Supply Liquidity", id: "step2" },
        { label: "Step 3 — Borrow Assets", id: "step3" },
      ],
      content: (
        <div className="flex flex-col gap-6">
          <section id="prerequisites">
            <h2 className="text-xl font-bold mb-3">Prerequisites</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse border border-gray-200 dark:border-white/10 rounded-lg">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                    <th className="p-3 font-semibold">Dependency</th>
                    <th className="p-3 font-semibold">Version</th>
                    <th className="p-3 font-semibold">Required</th>
                    <th className="p-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <td className="p-3 font-mono">Freighter Wallet</td>
                    <td className="p-3 font-mono">&gt;= 2.0</td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">Yes</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">For signing transactions on Testnet.</td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <td className="p-3 font-mono">Stellar Account</td>
                    <td className="p-3 font-mono">Testnet</td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">Yes</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">Must be funded via Friendbot faucet.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono">ERGO Tokens</td>
                    <td className="p-3 font-mono">Any</td>
                    <td className="p-3 text-gray-400">Optional</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">Required only for Governance proposal fees.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="step1">
            <h2 className="text-xl font-bold mb-3">Step 1 — Connect Wallet</h2>
            <p className="leading-relaxed mb-3">
              Open the Ergo Dashboard and click the **Connect Wallet** button in the upper right. Select your preferred provider (Freighter or Hana Wallet). Ensure your network is set to **Testnet** in the wallet preferences.
            </p>
            <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 font-mono text-xs">
              <span className="text-blue-500">const</span> wallet = <span className="text-emerald-500">await</span> window.stellarFreighter.getPublicKey();
            </div>
          </section>

          <section id="step2">
            <h2 className="text-xl font-bold mb-3">Step 2 — Supply Liquidity</h2>
            <p className="leading-relaxed mb-3">
              Navigate to the **Lending Pools** tab, choose your asset (e.g. USDC or XLM), click **Supply**, and enter the amount. This triggers two transactions:
            </p>
            <ol className="list-decimal pl-5 flex flex-col gap-1.5 leading-relaxed text-gray-600 dark:text-gray-300">
              <li>An **Approve** call authorizing the Core Pool contract to draw the tokens from your account.</li>
              <li>A **Supply** call updating your positions and transferring the tokens on-chain.</li>
            </ol>
          </section>

          <section id="step3">
            <h2 className="text-xl font-bold mb-3">Step 3 — Borrow Assets</h2>
            <p className="leading-relaxed">
              Once you have supplied collateral, you will earn interest and increase your **Borrow Capacity**. You can then select a borrowable asset and execute a **Borrow** transaction. Keep an eye on your **Health Factor** to prevent liquidation.
            </p>
          </section>
        </div>
      ),
    },
    architecture: {
      category: "Concepts",
      title: "Core Architecture",
      subtitle: "A deep dive into the hybrid Shared Core + Satellite isolation framework",
      toc: [
        { label: "Shared Liquidity Core", id: "core" },
        { label: "Isolated Satellite Pools", id: "satellites" },
        { label: "Liquidity Routing Flow", id: "routing" },
      ],
      content: (
        <div className="flex flex-col gap-6">
          <section id="core">
            <h2 className="text-xl font-bold mb-3">Shared Liquidity Core</h2>
            <p className="leading-relaxed">
              The Shared Core is a unified reserve of institutional-grade, highly liquid assets (e.g., USDC, EURC, XLM). Lenders deposit assets here to earn aggregate interest. Lenders can borrow any other core asset using their aggregate core balance as collateral. This pooled design minimizes spreads and optimizes capital efficiency.
            </p>
          </section>

          <section id="satellites">
            <h2 className="text-xl font-bold mb-3">Isolated Satellite Pools</h2>
            <p className="leading-relaxed">
              High-volatility or newly launched tokens are isolated inside separate **Satellite Pools**. These pools have their own risk parameters:
            </p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1 leading-relaxed">
              <li>Assets supplied to a Satellite Pool cannot be used as collateral to borrow assets from the Shared Core.</li>
              <li>Each Satellite Pool is self-contained: bad debt in a Satellite Pool is isolated, preventing cascading contagion.</li>
            </ul>
          </section>

          <section id="routing">
            <h2 className="text-xl font-bold mb-3">Liquidity Routing Flow</h2>
            <p className="leading-relaxed">
              The Vault Router monitors on-chain liquidations. If a borrow position falls below its liquidation threshold, the liquidation engine issues a Dutch auction. External arbitrageurs execute repayments to return the core to a healthy status.
            </p>
          </section>
        </div>
      ),
    },
    markets: {
      category: "Concepts",
      title: "Markets & Supported Assets",
      subtitle: "Overview of registered markets, collateral factors, and interest models",
      toc: [
        { label: "Market Specifications", id: "specs" },
        { label: "Interest Rate Curve", id: "rates" },
      ],
      content: (
        <div className="flex flex-col gap-6">
          <section id="specs">
            <h2 className="text-xl font-bold mb-3">Market Specifications</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse border border-gray-200 dark:border-white/10 rounded-lg">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                    <th className="p-3 font-semibold">Market Symbol</th>
                    <th className="p-3 font-semibold">Asset Address</th>
                    <th className="p-3 font-semibold">Collateral Factor</th>
                    <th className="p-3 font-semibold">Liquidation Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">usdc_shared</td>
                    <td className="p-3 font-mono text-xs">CB4A545E...QVA5</td>
                    <td className="p-3">85.00%</td>
                    <td className="p-3">90.00%</td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">eurc_shared</td>
                    <td className="p-3 font-mono text-xs">CBMW4L5H...TXYV</td>
                    <td className="p-3">85.00%</td>
                    <td className="p-3">90.00%</td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <td className="p-3 font-mono text-blue-500 font-bold">wbtc_satellite</td>
                    <td className="p-3 font-mono text-xs">CBWGK62T...HVAX</td>
                    <td className="p-3">70.00%</td>
                    <td className="p-3">75.00%</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-purple-500 font-bold">xlm_shared</td>
                    <td className="p-3 font-mono text-xs">Native SAC</td>
                    <td className="p-3">75.00%</td>
                    <td className="p-3">80.00%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="rates">
            <h2 className="text-xl font-bold mb-3">Interest Rate Curve</h2>
            <p className="leading-relaxed">
              Ergo uses a dual-slope interest rate model. When pool utilization is below the optimal threshold (e.g. 80%), rates increase slowly. Above the threshold, rates spike sharply to incentivize repayments and deposits.
            </p>
          </section>
        </div>
      ),
    },
    compliance: {
      category: "Concepts",
      title: "Compliance Layer",
      subtitle: "On-chain permission controls, clawback actions, and issuer settings",
      toc: [
        { label: "Overview", id: "overview" },
        { label: "Permissioned Flag", id: "flag" },
        { label: "Position Clawbacks", id: "clawback" },
      ],
      content: (
        <div className="flex flex-col gap-6">
          <section id="overview">
            <h2 className="text-xl font-bold mb-3">Overview</h2>
            <p className="leading-relaxed">
              For institutional assets that require strict compliance regulations (such as circle EURC/USDC), Ergo integrates a native compliance layer. The Compliance contract tracks allowlist verifications, manages issuer rules, and enables clawbacks.
            </p>
          </section>

          <section id="flag">
            <h2 className="text-xl font-bold mb-3">Permissioned Flag</h2>
            <p className="leading-relaxed">
              When an asset market is flagged as `permissioned`, users cannot supply or borrow the asset until they are verified on-chain. Before executing a transaction, the Core Pool queries `ComplianceContract.check_authorized(user, asset)`. If unauthorized, the transaction traps and aborts.
            </p>
          </section>

          <section id="clawback">
            <h2 className="text-xl font-bold mb-3">Position Clawbacks</h2>
            <p className="leading-relaxed">
              Asset issuers retain the right to execute clawbacks on-chain in compliance with regulatory mandates. Issuers can trigger `clawback_position` to reclaim supplied balances. The Compliance contract communicates with the Core Pool, executing the clawback atomically.
            </p>
          </section>
        </div>
      ),
    },
    risk: {
      category: "Concepts",
      title: "Risk & Liquidations",
      subtitle: "System safety, Dutch auctions, and backstop insurance reserves",
      toc: [
        { label: "LTV & Health Factor", id: "ltv" },
        { label: "Dutch Liquidation Auctions", id: "auctions" },
        { label: "USDC Backstop", id: "backstop-res" },
      ],
      content: (
        <div className="flex flex-col gap-6">
          <section id="ltv">
            <h2 className="text-xl font-bold mb-3">LTV & Health Factor</h2>
            <p className="leading-relaxed">
              An account's Health Factor measures its safety margin. If the Health Factor falls below `1.0`, the borrow position is subject to liquidation:
            </p>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 font-mono text-xs my-2 text-center text-gray-700 dark:text-gray-300">
              Health Factor = (Collateral Value * Collateral Factor) / Borrowed Debt Value
            </div>
          </section>

          <section id="auctions">
            <h2 className="text-xl font-bold mb-3">Dutch Liquidation Auctions</h2>
            <p className="leading-relaxed">
              Instead of sudden liquidations, Ergo uses dynamic Dutch auctions. The price discount on collateral starts at 0% and increases linearly over ledger height. Arbitrageurs can buy the collateral at a discount by paying off the borrower's debt.
            </p>
          </section>

          <section id="backstop-res">
            <h2 className="text-xl font-bold mb-3">USDC Backstop</h2>
            <p className="leading-relaxed">
              If an auction fails to attract bidders and bad debt accumulates, the **Backstop Manager** draws capital from the locked USDC insurance reserves. This covers shortfalls and preserves the system's solvency.
            </p>
          </section>
        </div>
      ),
    },
    "core-pool": {
      category: "Smart Contracts",
      title: "Core Pool Contract Reference",
      subtitle: "Entrypoint signatures and storage metrics for core-pool contract",
      toc: [
        { label: "Method Signatures", id: "methods" },
        { label: "Error Codes", id: "errors" },
      ],
      content: (
        <div className="flex flex-col gap-6">
          <section id="methods">
            <h2 className="text-xl font-bold mb-3">Method Signatures</h2>
            <p className="leading-relaxed mb-4 text-sm text-gray-600 dark:text-gray-400">
              Here are the key public functions exposed by the Core Pool contract:
            </p>
            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300">
                <span className="text-blue-500">pub fn</span> <span className="text-emerald-500">supply</span>(env: Env, user: Address, market: Symbol, amount: i128)
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300">
                <span className="text-blue-500">pub fn</span> <span className="text-emerald-500">borrow</span>(env: Env, user: Address, market: Symbol, amount: i128)
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300">
                <span className="text-blue-500">pub fn</span> <span className="text-emerald-500">withdraw</span>(env: Env, user: Address, market: Symbol, amount: i128)
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300">
                <span className="text-blue-500">pub fn</span> <span className="text-emerald-500">repay</span>(env: Env, user: Address, market: Symbol, amount: i128)
              </div>
            </div>
          </section>

          <section id="errors">
            <h2 className="text-xl font-bold mb-3">Error Codes</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 font-mono text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              <li><span className="font-bold text-red-500">1</span>: Unauthorized access to admin methods</li>
              <li><span className="font-bold text-red-500">2</span>: Invalid amount input (must be &gt; 0)</li>
              <li><span className="font-bold text-red-500">3</span>: Market not registered in core-pool</li>
              <li><span className="font-bold text-red-500">4</span>: Market is paused by governance</li>
              <li><span className="font-bold text-red-500">5</span>: Health factor drops below safety thresholds</li>
            </ul>
          </section>
        </div>
      ),
    },
    backstop: {
      category: "Smart Contracts",
      title: "Backstop Manager Reference",
      subtitle: "Technical specifications for the Backstop contract and insurance fund",
      toc: [
        { label: "Backstop Depositing", id: "deposit" },
        { label: "Withdrawal Cooldown", id: "cooldown" },
      ],
      content: (
        <div className="flex flex-col gap-6">
          <section id="deposit">
            <h2 className="text-xl font-bold mb-3">Backstop Depositing</h2>
            <p className="leading-relaxed">
              Liquidity providers deposit USDC directly into the Backstop contract. These funds do not yield lending interest directly; instead, they earn a premium from borrowers' transactions as insurance incentive fees.
            </p>
          </section>

          <section id="cooldown">
            <h2 className="text-xl font-bold mb-3">Withdrawal Cooldown</h2>
            <p className="leading-relaxed">
              To prevent bank runs during liquidation auctions, backstop withdrawals require a cooldown period. Users trigger a queue request, locking their funds for a cooldown duration (e.g. 10 ledgers) before the capital is released.
            </p>
          </section>
        </div>
      ),
    },
    oracle: {
      category: "Smart Contracts",
      title: "Oracle Aggregator Reference",
      subtitle: "Multi-feed price aggregation, reflector fallbacks, and circuit breakers",
      toc: [
        { label: "Price Resolution", id: "resolution" },
        { label: "DEX TWAP Fallback", id: "fallback" },
      ],
      content: (
        <div className="flex flex-col gap-6">
          <section id="resolution">
            <h2 className="text-xl font-bold mb-3">Price Resolution</h2>
            <p className="leading-relaxed">
              The Oracle contract acts as the protocol's pricing feed. It primary queries Reflector's decentralized feed. If Reflector returns valid data, the oracle aggregates it using a medianizer.
            </p>
          </section>

          <section id="fallback">
            <h2 className="text-xl font-bold mb-3">DEX TWAP Fallback</h2>
            <p className="leading-relaxed">
              If Reflector fails or goes offline, the oracle falls back to computing a time-weighted average price (TWAP) from Soroswap pool reserves. If both feeds fail or deviate by more than 15%, a circuit breaker is tripped, pausing new borrow positions.
            </p>
          </section>
        </div>
      ),
    },
    "api-ref": {
      category: "REST API",
      title: "REST API Reference",
      subtitle: "Endpoints for governance, active proposals, and transaction indexing",
      toc: [
        { label: "Proposals Endpoints", id: "endpoints-prop" },
        { label: "Price Snapshots Endpoints", id: "endpoints-price" },
      ],
      content: (
        <div className="flex flex-col gap-6">
          <section id="endpoints-prop">
            <h2 className="text-xl font-bold mb-3">Proposals Endpoints</h2>
            <div className="flex flex-col gap-4 font-mono text-xs text-gray-700 dark:text-gray-300">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <span className="text-emerald-500 font-bold">GET</span> /api/proposals
                <p className="text-[10px] text-gray-500 mt-1">Lists active and completed governance proposals.</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <span className="text-blue-500 font-bold">POST</span> /api/proposals
                <p className="text-[10px] text-gray-500 mt-1">Publishes a new governance proposal (requires 50 ERGO on-chain fee verification).</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <span className="text-blue-500 font-bold">POST</span> /api/proposals/:id/vote
                <p className="text-[10px] text-gray-500 mt-1">Casts a vote on a proposal (JSON payload: {'{ supports: boolean }'}).</p>
              </div>
            </div>
          </section>

          <section id="endpoints-price">
            <h2 className="text-xl font-bold mb-3">Price Snapshots Endpoints</h2>
            <div className="flex flex-col gap-4 font-mono text-xs text-gray-700 dark:text-gray-300">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <span className="text-emerald-500 font-bold">GET</span> /api/prices
                <p className="text-[10px] text-gray-500 mt-1">Fetches all cached oracle asset prices.</p>
              </div>
            </div>
          </section>
        </div>
      ),
    },
  };

  const activeDoc = docsData[activeTab] || docsData.welcome;

  // Filter left menu items dynamically if searched
  const filteredMenu = menu.map(group => {
    const items = group.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...group, items };
  }).filter(group => group.items.length > 0);

  return (
    <div className={`min-h-screen ${
      theme === "light" 
        ? "bg-white text-gray-800" 
        : "bg-[#0b0c0e] text-gray-100"
    } transition-colors duration-300 font-sans`}>
      
      {/* Top Navbar */}
      <header className={`sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b ${
        theme === "light" ? "bg-white/90 border-gray-100" : "bg-[#0b0c0e]/90 border-white/5"
      } backdrop-blur-md`}>
        <div className="flex items-center gap-6">
          {/* Logo link back home */}
          <Link href="/" className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-brandLime flex items-center justify-center">
              <img src="/logo.png" alt="Ergo Logo" className="size-5 rounded-full object-cover" />
            </div>
            <span className={`font-bold tracking-tight text-sm ${theme === "light" ? "text-black" : "text-white"}`}>
              ERGO PROTOCOL
            </span>
          </Link>

          {/* Search Input */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-64 pl-9 pr-8 py-1.5 rounded-lg text-xs outline-none border transition-all ${
                theme === "light"
                  ? "bg-gray-50 border-gray-200 focus:bg-white focus:border-gray-300 text-gray-800"
                  : "bg-white/5 border-white/5 focus:bg-white/10 focus:border-white/10 text-white"
              }`}
            />
            <div className={`absolute right-2 top-2 px-1.5 py-0.5 rounded text-[9px] font-mono border ${
              theme === "light" ? "bg-white border-gray-200 text-gray-400" : "bg-white/5 border-white/10 text-gray-500"
            }`}>
              Ctrl K
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
            className={`p-2 rounded-lg border transition-all ${
              theme === "light" ? "border-gray-100 hover:bg-gray-50" : "border-white/5 hover:bg-white/5"
            }`}
            title="Toggle Theme"
          >
            {theme === "light" ? <Moon className="size-4 text-gray-600" /> : <Sun className="size-4 text-amber-400" />}
          </button>

          {/* Launch App Button */}
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold text-xs transition-all hover:opacity-90 flex items-center gap-1 shadow-sm"
          >
            Launch App <span className="font-normal">→</span>
          </Link>
        </div>
      </header>

      {/* Page Body Wrapper */}
      <div className="max-w-7xl mx-auto flex">
        
        {/* Left Sidebar Menu */}
        <aside className={`w-64 shrink-0 hidden md:block border-r min-h-[calc(100vh-57px)] sticky top-[57px] p-6 ${
          theme === "light" ? "border-gray-100 bg-gray-50/20" : "border-white/5 bg-transparent"
        }`}>
          <nav className="flex flex-col gap-6">
            {filteredMenu.map((group, gIdx) => (
              <div key={gIdx} className="flex flex-col gap-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  theme === "light" ? "text-gray-400" : "text-gray-500"
                }`}>
                  {group.group}
                </span>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item, iIdx) => (
                    <button
                      key={iIdx}
                      onClick={() => setActiveTab(item.slug)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeTab === item.slug
                          ? theme === "light"
                            ? "bg-blue-50/60 text-blue-600 font-semibold"
                            : "bg-white/5 text-brandLime font-semibold"
                          : theme === "light"
                            ? "text-gray-600 hover:bg-gray-50"
                            : "text-gray-400 hover:bg-white/5"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Middle Main Content */}
        <main className="flex-1 min-w-0 px-8 py-10">
          <div className="max-w-2xl">
            {/* Breadcrumbs */}
            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${
              theme === "light" ? "text-gray-400" : "text-gray-500"
            }`}>
              <span>{activeDoc.category}</span>
              <ChevronRight className="size-3" />
              <span className={theme === "light" ? "text-gray-500" : "text-gray-300"}>{activeDoc.title}</span>
            </div>

            {/* Document Header */}
            <h1 className={`text-3xl font-extrabold tracking-tight mb-2 ${
              theme === "light" ? "text-black" : "text-white"
            }`}>
              {activeDoc.title}
            </h1>
            <p className={`text-sm mb-8 pb-6 border-b ${
              theme === "light" ? "text-gray-500 border-gray-100" : "text-gray-400 border-white/5"
            }`}>
              {activeDoc.subtitle}
            </p>

            {/* Dynamic Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {activeDoc.content}
            </div>
          </div>
        </main>

        {/* Right Sidebar - On This Page TOC */}
        <aside className="w-60 shrink-0 hidden lg:block p-6 sticky top-[57px] min-h-[calc(100vh-57px)]">
          <div className="flex flex-col gap-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              theme === "light" ? "text-gray-400" : "text-gray-500"
            }`}>
              <BookOpen className="size-3" /> On this page
            </span>
            <div className="flex flex-col gap-2 border-l border-gray-100 dark:border-white/5 pl-4">
              {activeDoc.toc.map((tocItem, idx) => (
                <a
                  key={idx}
                  href={`#${tocItem.id}`}
                  className={`text-xs hover:underline transition-all block ${
                    theme === "light" ? "text-gray-500 hover:text-black" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tocItem.label}
                </a>
              ))}
            </div>
          </div>
        </aside>

      </div>

    </div>
  );
}
