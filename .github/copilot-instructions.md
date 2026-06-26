# ERGO PROTOCOL — MASTER BUILD PROMPT FOR VS CODE COPILOT

Paste this entire document as context/instructions into Copilot Chat (or as a `.github/copilot-instructions.md` file in the repo root so it persists across sessions).

---

## PROJECT CONTEXT

I am building **Ergo Protocol** — a non-custodial, over-collateralized DeFi lending protocol on **Stellar (Soroban smart contracts)**. We are deliberately positioning ourselves as a superior alternative to **Blend Capital**, the current leading lending protocol on Stellar. Every architectural decision below exists specifically to fix a known weakness in Blend's design:

- Blend fragments liquidity across fully isolated pools → we use a **Shared Liquidity Core + Isolated Satellite Pools** hybrid for better capital efficiency.
- Blend lets each pool pick a single oracle with no fallback → we use a **multi-source Oracle Aggregator** (median-of-N, staleness checks, circuit breakers).
- Blend's liquidations depend entirely on external bots showing up → we add **flash-loan-funded liquidations** plus a **protocol-owned fallback liquidator**.
- Blend has no compliance/permissioned market layer → we have a **native Compliance Module** for institutional/RWA markets using Stellar's native authorization/clawback.

Deployment plan: **Stellar Devnet/Testnet first → full audit + formal verification → Mainnet.** Do not write anything that only works on testnet-specific shortcuts; write production-grade code from day one.

---

## REPOSITORY STRUCTURE — SCAFFOLD THIS FIRST

```
ergo-protocol/
├── README.md
├── .github/
│   ├── copilot-instructions.md       # this file
│   └── workflows/                    # CI: build, test, lint per contract
├── contracts/
│   ├── core-pool/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs                # #[contract] entry point only — keep thin
│   │       ├── market.rs             # Market struct, create_market, config
│   │       ├── position.rs           # UserPosition, supply/withdraw/borrow/repay
│   │       ├── interest_rate.rs      # utilization-based IRM
│   │       ├── health_factor.rs      # get_health_factor
│   │       ├── flash_loan.rs         # flash_loan()
│   │       ├── credit_delegation.rs  # delegate_credit()
│   │       ├── storage.rs            # storage key helpers, TTL/bump logic
│   │       ├── errors.rs
│   │       └── test.rs
│   ├── oracle-aggregator/
│   │   └── src/{lib.rs, feeds.rs, aggregate.rs, circuit_breaker.rs, errors.rs, test.rs}
│   ├── backstop/
│   │   └── src/{lib.rs, deposit.rs, draw.rs, emissions.rs, storage.rs, errors.rs, test.rs}
│   ├── liquidation-engine/
│   │   └── src/{lib.rs, auction.rs, dutch_curve.rs, fill.rs, protocol_liquidator.rs, bad_debt.rs, errors.rs, test.rs}
│   ├── governance/
│   │   └── src/{lib.rs, proposals.rs, voting.rs, timelock.rs, executor.rs, emitter.rs, errors.rs, test.rs}
│   └── compliance/
│       └── src/{lib.rs, authorization.rs, permissioned_market.rs, clawback.rs, errors.rs, test.rs}
├── shared/                            # library crate, NOT a deployed contract
│   └── src/{lib.rs, types.rs, constants.rs}
├── scripts/
│   ├── deploy-devnet.ts
│   ├── deploy-mainnet.ts
│   ├── mock-setup.ts                 # mock tokens/oracle feeds for devnet
│   └── .env.example
├── server/                            # off-chain API layer
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/                   # positions, markets, proposals, health-factor
│   │   ├── services/                 # rpc client, indexer client, price cache
│   │   ├── db/                       # postgres schema + queries
│   │   └── middleware/                # SEP-10 auth verification
│   └── package.json
├── client/                            # frontend
│   ├── app/ or pages/                # Next.js
│   ├── components/
│   ├── lib/                          # stellar-sdk wrappers, wallet kit setup
│   ├── styles/                       # design tokens (see UI section below)
│   └── package.json
├── keepers/                           # liquidation bots, protocol fallback liquidator
│   └── src/{watcher.ts, liquidator.ts, flashLoanFiller.ts}
└── tests/
    └── integration/{full_flow_test.rs, isolation_invariant_test.rs}
```

**Instruction to Copilot:** When generating files, always respect this structure. Never put contract logic in `lib.rs` beyond the `#[contract]` impl block delegating to the relevant module. Never mix frontend and contract code in the same package.

---

## SMART CONTRACT REQUIREMENTS — ALL 6 CONTRACTS

Write all Soroban contracts in **Rust using `soroban-sdk`**, following these non-negotiable standards:

### General code quality rules (apply to every contract)
1. Every public function must have a doc comment explaining purpose, parameters, and failure conditions.
2. Every fallible operation returns `Result<T, Error>` — never panic in production logic paths; reserve panics only for truly unreachable states.
3. Use a dedicated `errors.rs` per contract with a `#[contracterror]` enum — no magic numbers or string errors.
4. Storage access goes through helper functions in a `storage.rs` module — no raw `env.storage()` calls scattered through business logic.
5. Gas/resource efficiency: minimize storage reads/writes per call, batch where possible, use `temporary` storage for short-lived data (e.g. price cache) and `persistent`/`instance` only where genuinely needed long-term.
6. Write unit tests for every function, plus explicit tests for edge cases: zero amounts, max values, reentrancy attempts, unauthorized caller attempts.
7. No hardcoded addresses — all dependent contract addresses (Oracle, Backstop, Governance) are configurable via an admin-set/governance-set storage value, never compiled in.

### Contract 1 — Core Pool
- Implements: `supply`, `withdraw`, `borrow`, `repay`, `flash_loan`, `delegate_credit`, `get_health_factor`, `create_market` (governance-gated), `pause_market`/`resume_market` (governance-gated).
- Must support three market types in one contract: Shared Core, Isolated Satellite (with debt ceiling), E-Mode category.
- `borrow`/`withdraw` must call Oracle Aggregator for live pricing and revert if resulting health factor < 1.0.
- `flash_loan` must guarantee full-transaction atomicity — write a test that confirms state fully reverts on an unrepaid flash loan.
- Calls `Compliance.check_authorized()` ONLY when a market is flagged permissioned — permissionless markets must have zero added gas cost from this check.

### Contract 2 — Oracle Aggregator
- Implements: `get_price`, `register_feed` (governance-gated), `trip_circuit_breaker`, `confirm_pause`/`override_with_new_feeds` (governance-gated).
- Pulls from multiple registered feeds (Reflector as primary, at least one DEX TWAP as secondary), computes the **median** (not mean) across valid (non-stale) feeds.
- Reject any feed older than a configurable `MAX_STALENESS`.
- If feed disagreement exceeds `MAX_DEVIATION_BPS`, trip the circuit breaker for that specific asset only — never a global pause.
- Write fuzz tests simulating: one feed stale, one feed wildly deviated, all feeds dark.

### Contract 3 — Backstop
- Implements: `deposit`, `queue_withdrawal`, `draw` (callable ONLY by Liquidation Engine), `gulp_emissions`, `set_allocation` (governance-gated).
- Track insurance capital per `pool_id` internally — write an explicit isolation test proving `draw(pool_id=A)` never touches `pool_id=B`'s balance.
- Withdrawal queue must have a cooldown to prevent bank-run draining during an active crisis.

### Contract 4 — Liquidation & Auction Engine
- Implements: `create_liquidation_auction`, `fill_auction`, `fill_via_flash_loan`, `run_protocol_liquidator`, `finalize_bad_debt`.
- Dutch auction: discount starts near zero and increases over a bounded ledger window; write the decay curve as a pure, testable function in `dutch_curve.rs`.
- `fill_via_flash_loan` must call Core Pool's `flash_loan` atomically — liquidator needs zero pre-positioned capital.
- `run_protocol_liquidator` triggers automatically if no external fill occurs before the auction window closes — this must be provably guaranteed, write a test with zero external participants confirming the position still closes.
- `finalize_bad_debt` calls `Backstop.draw()` only for the exact residual shortfall, never more.

### Contract 5 — Governance
- Implements: `create_proposal`, `vote`, `finalize_proposal`, `execute_proposal`, plus 5 specific proposal-type handlers:
  1. Market Pause/Resume → calls Core Pool
  2. Oracle Circuit Breaker Override → calls Oracle Aggregator
  3. Backstop Allocation Decision → calls Backstop
  4. Compliance Permissioning → calls Compliance Module
  5. Risk Param & Timelock Update → calls Core Pool params
- `execute_proposal` must ONLY be able to call the specific pre-whitelisted function encoded in the proposal — write a test proving it cannot make an arbitrary contract call.
- Timelock duration should be configurable per proposal type (shorter for emergency pause, longer for backstop allocation changes).
- Voting and quorum logic must be cleanly separated from execution logic (separate modules: `voting.rs` vs `executor.rs`).

### Contract 6 — Compliance Module
- Implements: `check_authorized`, `flag_market_permissioned` (governance-gated), `clawback_position` (issuer-signer-gated).
- Integrate with Stellar's native authorization flags / clawback primitives directly — do not reinvent KYC logic on-chain; this contract is a thin, auditable wrapper.
- Must be fully optional per market — write a test proving a permissionless market's `supply`/`borrow` flow never invokes this contract at all.

### Testing & verification expectations
- Full integration test suite in `tests/integration/` covering: supply → borrow → liquidation → bad debt → backstop draw, and the full governance proposal lifecycle end-to-end.
- Flag any function that should later be run through Certora Sunbeam Prover for formal verification with a `// TODO: formal-verify` comment, listing the specific invariant.

---

## OFF-CHAIN COMPONENTS

**`server/`** — Node.js/TypeScript API. Verifies SEP-10 wallet auth signatures, serves cached reads from Postgres (positions, markets, proposals) and Redis (live prices, health factors). Never holds or signs with user private keys.

**`keepers/`** — Dockerized bots watching health factors via the indexer, triggering `create_liquidation_auction`, and attempting `fill_via_flash_loan` when profitable. Include a separate, protocol-owned fallback liquidator service funded by Backstop, as a redundant safety net independent of any third party.

**`scripts/`** — Deployment scripts parameterized by network (`devnet`/`testnet`/`mainnet`), never hardcoding RPC URLs or contract addresses; load from `.env`.

---

## UI / FRONTEND DESIGN INSTRUCTIONS

Build the frontend in **Next.js + React + Tailwind**, mobile-first, and treat this as a serious fintech product — **not a "vibe-coded" crypto site.** Reference points: the polish level of Stripe, Linear, or a well-funded fintech (similar to the BloomFi/USD Bloom landing page reference provided), not a generic Web3 template.

### Brand identity
- **Logo:** the provided Σ-style mark (stylized "E" rendered as a sigma-like swoosh dissolving into pixel particles) on a **lime/chartreuse green (#D4FF3F-ish) background**, rendered in near-black. Use this exact mark consistently — do not regenerate or reinterpret the logo shape.
- **Name:** "Ergo Protocol" / "Ergo" for short.

### Color palette (derived from the provided reference images)
- **Primary background:** near-black / deep charcoal (`#0A0A0F` range) for the main app shell, especially DeFi data screens (matches the dark, premium feel of the prismatic/iridescent reference images).
- **Primary accent:** electric purple/violet (`#7C3AED`–`#9333EA` range) — used for primary CTAs, active states, key data highlights, gradients.
- **Secondary accent:** lime/chartreuse green (`#D4FF3F`–`#C6FF00` range) — used sparingly, for the logo, key positive indicators (e.g. positive APY, healthy position status), and high-emphasis micro-interactions. Do not overuse green — it should feel like a "pop" accent, not a base color.
- **Gradient treatment:** purple-to-blue and purple-to-lime iridescent/prismatic gradients (as seen in the abstract light-streak reference images) for hero backgrounds, card hover states, and loading/empty states — subtle, never garish.
- **Text:** off-white/near-white on dark backgrounds, near-black on the lime logo background; ensure WCAG AA contrast minimums everywhere.

### Typography
- **Font: Instrument Sans**, used elegantly and consistently across all weights — headings in a heavier weight with generous letter-spacing for a refined, editorial feel (similar to the "Where Money Grows" hero reference); body text in regular/medium weight, comfortable line-height (1.5–1.6) for readability of financial data.
- Avoid default system fonts anywhere — Instrument Sans loaded via `next/font` for performance, with proper fallback stack.
- Numerical/financial data (APYs, balances, health factors) should use tabular figures for clean alignment in tables and dashboards.

### Hero section
- Follow the structure of the second reference image: a bold, short, confident headline (something like Ergo's own equivalent of "Where Money Grows" — e.g. "Lend Smarter. Borrow Safer." or similar — propose 2-3 headline options), a one-line subhead explaining the protocol in plain language (no jargon like "isolated satellite pools" on the marketing homepage — save technical depth for docs), and a single clear primary CTA ("Launch App" / "Connect Wallet").
- Use the iridescent/prismatic light imagery as ambient background texture behind or beside the hero text — abstract, premium, not literal crypto iconography (no generic "chain link" or "coin" clipart).

### Layout principles (apply throughout, not just hero)
- Generous whitespace; avoid cramming dashboard data into dense, cluttered tables — use card-based layouts with clear visual hierarchy.
- Subtle motion only — gentle fade/slide-ins on scroll, smooth number transitions on live data updates (APY, health factor) — never gratuitous animation that distracts from financial decision-making.
- Every CTA button should have a clear, singular action label — no ambiguous "Learn More" stacked next to three other competing buttons.
- Dashboard screens (Supply/Borrow/Markets/Governance) should clearly visually distinguish: Shared Core markets vs. Satellite/Isolated markets vs. Permissioned/Institutional markets — use a consistent badge/tag system, not just text labels.

### Mobile-first structure
- Design and build mobile layouts FIRST, then scale up — not the reverse.
- Bottom tab navigation on mobile (Supply / Borrow / Governance / Wallet) rather than a hidden hamburger burying core actions.
- Collateral/health-factor data must be glanceable on mobile — a persistent, compact health-factor indicator (color-coded: green=healthy, amber=caution, red=at-risk) visible without scrolling whenever a user has an open position.
- Wallet connect flow (Freighter/Albedo/xBull via Stellar Wallets Kit) must work cleanly on mobile browsers and in-app wallet browsers, not just desktop extensions.
- Forms (supply/borrow amount input) should use large, thumb-friendly tap targets and numeric keypads on mobile.

### What to explicitly avoid
- No generic "crypto dashboard" template look (no neon-on-black with default Inter font and stock rocket/moon iconography).
- No overuse of gradients or glow effects to the point of looking AI-generated or templated — restraint is the goal; let the purple/lime palette and Instrument Sans typography carry the premium feel rather than excessive visual effects.
- No inconsistent spacing/sizing — establish a strict 8px (or 4px) spacing scale and stick to it everywhere via Tailwind config, not ad hoc margins.
- No placeholder Lorem Ipsum in committed code — write real, accurate copy reflecting Ergo's actual positioning (safer liquidations, better capital efficiency, institutional-ready) even in early scaffolding.

### Deliverable expectation from Copilot for UI work
When generating components, always: (1) use Tailwind config with the above colors/fonts defined as design tokens (not inline hex values scattered through components), (2) build mobile breakpoint first then add `md:`/`lg:` overrides, (3) keep components small and composable (a single `Button`, `Card`, `Badge`, `HealthFactorIndicator` etc. reused everywhere, not one-off styled divs per page).

---

**End of master prompt. Use this as persistent context for all Copilot sessions on this repository.**