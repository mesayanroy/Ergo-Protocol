"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useStellarWallet } from "../../lib/stellar-wallet";
import { StellarWalletModal } from "../StellarWalletModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Globe, TrendingUp, Shield, ArrowLeftRight, CircleDot, UserCog,
  Search, Bell, Settings, ArrowUpRight, ArrowDownRight, Check, X,
  AlertTriangle, Info, Clock, Plus, Minus, HelpCircle, LogOut,
  Sliders, ChevronRight, Activity, Award, ChevronDown, Copy, ExternalLink
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// Design tokens matching Ergo theme
const CARD_SHADOW = "rgba(0, 0, 0, 0.4) 0px 4px 20px 0px";
const SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };

// Colors
const C = {
  lime: "#d4ff3f",
  limeMuted: "rgba(212, 255, 63, 0.2)",
  purple: "#7c3aed",
  purpleMuted: "rgba(124, 58, 237, 0.2)",
  red: "#ef4444",
  redMuted: "rgba(239, 68, 68, 0.2)",
  grey: "#9fadaa",
  bg: "#0b0b0d",
  card: "#121316",
  border: "rgba(255, 255, 255, 0.05)",
  grid: "rgba(255, 255, 255, 0.02)",
};

function KpiCard({
  label, value, change, prefix = "", suffix = "", delay = 0, icon: Icon,
}: {
  label: string; value: string; change?: number; prefix?: string; suffix?: string; delay?: number; icon?: React.ComponentType<any>
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#121316]/50 p-4 lg:p-5 group hover:scale-[1.01] transition-transform duration-300"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.03] pointer-events-none">
        {Icon && <Icon className="size-24 -translate-y-4 translate-x-4" />}
      </div>
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#9fadaa] mb-2.5 font-sans">
        {label}
      </p>
      <p className="text-2xl lg:text-3xl font-bold text-white font-mono tracking-tighter leading-none">
        {prefix}{value}{suffix}
      </p>
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-3">
          <div className={`flex items-center gap-0.5 text-xs font-semibold font-mono px-1.5 py-0.5 rounded-md ${
            isPositive ? "bg-[#d4ff3f]/10 text-[#d4ff3f]" : "bg-red-500/10 text-red-500"
          }`}>
            {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {isPositive ? "+" : ""}{change}%
          </div>
          <span className="text-[10px] text-[#9fadaa]/70 font-sans">vs last month</span>
        </div>
      )}
    </motion.div>
  );
}

interface AssetPool {
  id: string;
  name: string;
  symbol: string;
  logo: string;
  supplyApy: number;
  borrowApy: number;
  tvl: number;
  totalBorrowed: number;
  utilizationRate: number;
  collateralFactor: number;
  walletBalance: number;
  supplied: number;
  borrowed: number;
}

export default function ErgoDashboard() {
  const { walletAddress, walletProvider, disconnect, connectWallet } = useStellarWallet();
  
  // Hydration state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch live balance from Horizon API
  useEffect(() => {
    if (!walletAddress || !mounted) return;
    
    // Skip if it's the static simulated addresses
    if (walletAddress.startsWith("GBDEMO") || walletAddress.startsWith("GBLOBSTR")) {
      return;
    }

    const fetchLiveBalances = async () => {
      try {
        const horizonUrl = `https://horizon-testnet.stellar.org/accounts/${walletAddress}`;
        const res = await fetch(horizonUrl);
        if (res.status === 404) {
          console.warn("Stellar account is not funded on Testnet yet.");
          return;
        }
        
        const data = await res.json();
        if (data && data.balances) {
          // Native asset is XLM
          const nativeBalance = data.balances.find((b: any) => b.asset_type === "native");
          // USDC token
          const usdcBalance = data.balances.find((b: any) => b.asset_code === "USDC");
          // EURC token
          const eurcBalance = data.balances.find((b: any) => b.asset_code === "EURC");
          // ERGO token
          const ergoBalance = data.balances.find((b: any) => b.asset_code === "ERGO");

          setAssetPools((prevPools) =>
            prevPools.map((pool) => {
              let updatedBalance = pool.walletBalance;
              if (pool.id === "xlm" && nativeBalance) {
                updatedBalance = parseFloat(nativeBalance.balance);
              } else if (pool.id === "usdc" && usdcBalance) {
                updatedBalance = parseFloat(usdcBalance.balance);
              } else if (pool.id === "eurc" && eurcBalance) {
                updatedBalance = parseFloat(eurcBalance.balance);
              } else if (pool.id === "ergo" && ergoBalance) {
                updatedBalance = parseFloat(ergoBalance.balance);
              }
              return {
                ...pool,
                walletBalance: updatedBalance,
              };
            })
          );
        }
      } catch (error) {
        console.error("Error querying live Stellar account balance:", error);
      }
    };

    fetchLiveBalances();
    // Poll every 10 seconds to display real-time values
    const interval = setInterval(fetchLiveBalances, 10000);
    return () => clearInterval(interval);
  }, [walletAddress, mounted]);

  // UI state
  const [activeSection, setActiveSection] = useState<string>("portfolio");
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"supply" | "withdraw" | "borrow" | "repay">("supply");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("xlm");
  const [txAmount, setTxAmount] = useState<string>("");
  
  // Protocol State Simulation
  const [assetPools, setAssetPools] = useState<AssetPool[]>([
    {
      id: "xlm",
      name: "Stellar Lumens",
      symbol: "XLM",
      logo: "🪐",
      supplyApy: 2.15,
      borrowApy: 4.85,
      tvl: 14850000,
      totalBorrowed: 4250000,
      utilizationRate: 28.6,
      collateralFactor: 65,
      walletBalance: 15200,
      supplied: 8000,
      borrowed: 2500,
    },
    {
      id: "usdc",
      name: "Circle USD",
      symbol: "USDC",
      logo: "💵",
      supplyApy: 5.85,
      borrowApy: 8.24,
      tvl: 24500000,
      totalBorrowed: 18100000,
      utilizationRate: 73.8,
      collateralFactor: 80,
      walletBalance: 2500,
      supplied: 1200,
      borrowed: 0,
    },
    {
      id: "eurc",
      name: "Circle Euro",
      symbol: "EURC",
      logo: "💶",
      supplyApy: 4.92,
      borrowApy: 7.15,
      tvl: 8520000,
      totalBorrowed: 5210000,
      utilizationRate: 61.1,
      collateralFactor: 75,
      walletBalance: 1800,
      supplied: 0,
      borrowed: 0,
    },
    {
      id: "ergo",
      name: "Ergo Token",
      symbol: "ERGO",
      logo: "🛡️",
      supplyApy: 8.45,
      borrowApy: 12.80,
      tvl: 3200000,
      totalBorrowed: 980000,
      utilizationRate: 30.6,
      collateralFactor: 50,
      walletBalance: 2500,
      supplied: 450,
      borrowed: 0,
    },
  ]);

  // Governance wizard and timelock queue states
  const [isCreatePropModalOpen, setIsCreatePropModalOpen] = useState(false);
  const [newPropTitle, setNewPropTitle] = useState("");
  const [newPropTarget, setNewPropTarget] = useState("");
  const [newPropAction, setNewPropAction] = useState("");
  const [newPropDesc, setNewPropDesc] = useState("");
  const [timelockQueue, setTimelockQueue] = useState([
    {
      id: "ERP-09",
      title: "Upgrade Compliance Module Allowlist Gatekeeper",
      targetContract: "CAC...GK88",
      actionName: "UPGRADE",
      eta: "14 hours",
      status: "Queued"
    }
  ]);

  // Governance proposals simulation
  const [proposals, setProposals] = useState([
    {
      id: "ERP-12",
      title: "Increase XLM Collateral Factor to 70%",
      description: "Upgrade the risk parameters of the XLM liquidity pool based on decreased volatility limits.",
      proposer: "GA5W...XLM4",
      votesFor: 1245000,
      votesAgainst: 421000,
      hasVoted: false,
      status: "Active",
      endsIn: "2 days",
    },
    {
      id: "ERP-11",
      title: "Integrate EURC Dutch Liquidity Vault",
      description: "Deploy automated Dutch auction settlement smart contracts for non-custodial EURC liquidation.",
      proposer: "GB3K...USDC",
      votesFor: 2840000,
      votesAgainst: 95000,
      hasVoted: false,
      status: "Active",
      endsIn: "4 days",
    },
    {
      id: "ERP-10",
      title: "Enable Soroban Oracle Multi-Feed Circuit Breaker",
      description: "Upgrade protocol price queries to fetch aggregated Reflector and DEX TWAP averages.",
      proposer: "GC9Q...ERGO",
      votesFor: 4890000,
      votesAgainst: 12000,
      hasVoted: true,
      status: "Executed",
      endsIn: "Ended",
    },
  ]);

  const [expandedPools, setExpandedPools] = useState<Record<string, boolean>>({});
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [showEmodeConfirm, setShowEmodeConfirm] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [proposalType, setProposalType] = useState("MarketPauseResume");

  // Notification lists
  const [notifications, setNotifications] = useState([
    { id: 1, type: "success", title: "Supply Verified", message: "Supplied 8,000 XLM to Shared Liquidity Pool", time: "2 min ago", read: false },
    { id: 2, type: "info", title: "Rewards Credited", message: "Earned 24.5 ERGO staking yield rewards", time: "1h ago", read: false },
    { id: 3, type: "warning", title: "LTV Threshold Alert", message: "USDC Collateral factor updated in proposal ERP-09", time: "5h ago", read: true },
  ]);

  // Transaction history simulation
  const [transactions, setTransactions] = useState([
    { id: "tx-1", type: "SUPPLY", asset: "XLM", amount: 8000, hash: "c82b...f01e", date: "2026-07-01", time: "05:12" },
    { id: "tx-2", type: "BORROW", asset: "XLM", amount: 2500, hash: "4fa3...9c18", date: "2026-07-01", time: "05:10" },
    { id: "tx-3", type: "SUPPLY", asset: "USDC", amount: 1200, hash: "9e2a...3a1c", date: "2026-06-30", time: "18:42" },
  ]);

  // E-mode & Credit Delegation states
  const [emodeEnabled, setEmodeEnabled] = useState(false);
  const [delegationAddress, setDelegationAddress] = useState("");
  const [delegationLimit, setDelegationLimit] = useState("500");
  const [activeDelegations, setActiveDelegations] = useState<any[]>([
    { address: "GBXV...DELEGATE", limit: 500, status: "Active" }
  ]);

  // Risk control health simulator
  const [simulatedCollateralOffset, setSimulatedCollateralOffset] = useState<number>(0);

  // Asset price feeds
  const prices: Record<string, number> = {
    xlm: 0.112,
    usdc: 1.00,
    eurc: 1.08,
    ergo: 2.50,
  };

  // Calculations for dynamic lending stats
  const totals = useMemo(() => {
    let totalSuppliedUSD = 0;
    let totalBorrowedUSD = 0;
    let collateralLimitUSD = 0;
    
    assetPools.forEach((pool) => {
      const price = prices[pool.id] || 1;
      totalSuppliedUSD += pool.supplied * price;
      totalBorrowedUSD += pool.borrowed * price;
      const cf = (emodeEnabled && (pool.id === "usdc" || pool.id === "eurc")) ? 90 : pool.collateralFactor;
      collateralLimitUSD += pool.supplied * price * (cf / 100);
    });

    // Apply simulation slider offsets for risk section
    const currentSuppliedUSD = Math.max(0, totalSuppliedUSD + simulatedCollateralOffset);
    const simulatedCollateralLimit = Math.max(0, collateralLimitUSD + (simulatedCollateralOffset * 0.7));

    // Health Factor: Collateral Limit / Borrowed USD
    const healthFactor = totalBorrowedUSD > 0 ? simulatedCollateralLimit / totalBorrowedUSD : 99.9;
    const ltv = currentSuppliedUSD > 0 ? (totalBorrowedUSD / currentSuppliedUSD) * 100 : 0;

    return {
      suppliedUSD: totalSuppliedUSD,
      borrowedUSD: totalBorrowedUSD,
      healthFactor: parseFloat(healthFactor.toFixed(2)),
      ltv: parseFloat(ltv.toFixed(1)),
      collateralLimitUSD,
    };
  }, [assetPools, simulatedCollateralOffset]);

  // Average Yield rate calculations
  const avgApy = useMemo(() => {
    let supplyWeight = 0;
    let totalSupplied = 0;
    assetPools.forEach(p => {
      supplyWeight += p.supplied * p.supplyApy;
      totalSupplied += p.supplied;
    });
    return totalSupplied > 0 ? parseFloat((supplyWeight / totalSupplied).toFixed(2)) : 0;
  }, [assetPools]);

  // Active pool selection details for modals
  const activePool = assetPools.find(p => p.id === selectedAssetId) || assetPools[0];

  const handleVote = (id: string, supports: boolean) => {
    setProposals(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          votesFor: supports ? p.votesFor + 2500 : p.votesFor,
          votesAgainst: !supports ? p.votesAgainst + 2500 : p.votesAgainst,
          hasVoted: true,
        };
      }
      return p;
    }));
  };

  const handleTxSubmit = () => {
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) return;

    setAssetPools(prev => prev.map(p => {
      if (p.id === selectedAssetId) {
        let updatedWallet = p.walletBalance;
        let updatedSupplied = p.supplied;
        let updatedBorrowed = p.borrowed;

        if (txType === "supply") {
          updatedWallet = Math.max(0, p.walletBalance - amount);
          updatedSupplied += amount;
        } else if (txType === "withdraw") {
          updatedSupplied = Math.max(0, p.supplied - amount);
          updatedWallet += amount;
        } else if (txType === "borrow") {
          updatedBorrowed += amount;
          updatedWallet += amount;
        } else if (txType === "repay") {
          updatedWallet = Math.max(0, p.walletBalance - amount);
          updatedBorrowed = Math.max(0, p.borrowed - amount);
        }

        return {
          ...p,
          walletBalance: updatedWallet,
          supplied: updatedSupplied,
          borrowed: updatedBorrowed,
        };
      }
      return p;
    }));

    // Add transaction history entry
    const newTx = {
      id: `tx-${Date.now()}`,
      type: txType.toUpperCase(),
      asset: activePool.symbol,
      amount,
      hash: `${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
    };

    setTransactions(prev => [newTx, ...prev]);

    // Add alert notification
    const notif = {
      id: Date.now(),
      type: "success" as const,
      title: `${txType.charAt(0).toUpperCase() + txType.slice(1)} Successful`,
      message: `${txType.toUpperCase()} ${amount.toLocaleString()} ${activePool.symbol} verification completed.`,
      time: "Just now",
      read: false,
    };
    setNotifications(prev => [notif, ...prev]);

    setIsTxModalOpen(false);
    setTxAmount("");
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!mounted) return null;

  return (
    <div className="w-full min-h-screen bg-[#0b0b0d] text-[#f5f5f2] flex overflow-hidden font-sans">
      
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.03] blur-[120px]" style={{ background: C.lime }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.02] blur-[100px]" style={{ background: C.purple }} />
      </div>

      {/* ─── SIDEBAR (Left Panel) ─────────────────────────────────── */}
      <aside className="hidden md:flex w-64 border-r border-white/5 bg-[#121316]/40 backdrop-blur-xl shrink-0 flex-col justify-between z-10">
        <div className="flex flex-col gap-6 p-6">
          {/* Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shadow-[0_0_15px_rgba(212,255,63,0.2)] flex-shrink-0 bg-brandLime/10 p-1 flex items-center justify-center">
              <img src="/logo.png" alt="Ergo Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-sans font-bold text-base tracking-tight text-white flex items-center gap-1">
              ergo <span className="text-brandLime">protocol</span>
            </span>
          </div>

          <div className="h-px bg-white/5 my-2" />

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {[
              { id: "portfolio", label: "My Portfolio", icon: Wallet },
              { id: "market", label: "Lending Pools", icon: Globe },
              { id: "performance", label: "Yield Attribution", icon: TrendingUp },
              { id: "risk", label: "Risk controls", icon: Shield },
              { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
              { id: "governance", label: "Governance", icon: CircleDot },
              { id: "settings", label: "Settings", icon: UserCog },
            ].map((item) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 w-full text-left ${
                    isActive ? "text-white bg-[#d4ff3f]/10 border border-[#d4ff3f]/15" : "text-[#9fadaa] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? "text-[#d4ff3f]" : ""}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute right-3 w-1.5 h-1.5 rounded-full bg-brandLime"
                      transition={SPRING}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Connected Wallet info */}
        <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col gap-3">
          {walletAddress ? (
            <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-brandLime font-bold uppercase tracking-wider">{walletProvider}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brandLime animate-pulse" />
              </div>
              <p className="text-xs font-mono text-white truncate">{walletAddress}</p>
              <button
                onClick={disconnect}
                className="flex items-center justify-center gap-1.5 mt-2 py-1.5 rounded-lg border border-red-500/10 hover:border-red-500/20 text-[10px] font-bold text-red-400 hover:bg-red-500/5 transition-all"
              >
                <LogOut className="size-3" />
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="w-full py-3 rounded-xl bg-brandLime hover:bg-brandLime/90 text-brandDark font-bold text-xs tracking-wider transition-all"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </aside>

      {/* ─── MAIN CONTENT PANE ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto z-10 relative">
        
        {/* Top Navbar Header */}
        <header className="h-16 border-b border-white/5 bg-[#121316]/20 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs text-brandGray font-medium">
            <span>Protocol</span>
            <ChevronRight className="size-3 text-brandGray/40" />
            <span className="text-white font-semibold capitalize">{activeSection}</span>
            {totals.borrowedUSD > 0 && (
              <span 
                className="md:hidden ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold border"
                style={{
                  borderColor: totals.healthFactor < 1.2 ? C.red : totals.healthFactor < 2.0 ? "#f59e0b" : C.lime,
                  color: totals.healthFactor < 1.2 ? C.red : totals.healthFactor < 2.0 ? "#f59e0b" : C.lime,
                  backgroundColor: totals.healthFactor < 1.2 ? "rgba(239,68,68,0.1)" : totals.healthFactor < 2.0 ? "rgba(245,158,11,0.1)" : "rgba(212,255,63,0.1)"
                }}
              >
                HF: {totals.healthFactor > 50 ? "Infinite" : totals.healthFactor}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-2.5 size-4 text-brandGray/60" />
              <input
                type="text"
                placeholder="Search assets..."
                className="bg-[#121316] border border-white/5 focus:border-[#7c3aed]/40 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-brandGray/40 outline-none w-56"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="size-4.5 text-brandGray" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 size-4.5 rounded-full bg-brandLime text-black text-[9px] font-bold flex items-center justify-center font-mono">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Overlay Menu */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 rounded-2xl border border-white/5 bg-[#121316]/95 backdrop-blur-xl p-4 shadow-2xl z-50"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                      <span className="text-xs font-bold text-white">Notifications</span>
                      <button
                        onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                        className="text-[10px] text-brandLime hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className={`p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs flex gap-2 ${!n.read ? "border-brandLime/20 bg-brandLime/5" : ""}`}>
                          <div className="mt-0.5"><Info className="size-3 text-brandLime" /></div>
                          <div>
                            <p className="font-semibold text-white">{n.title}</p>
                            <p className="text-[10px] text-brandGray mt-0.5 leading-relaxed">{n.message}</p>
                            <span className="text-[9px] text-brandGray/40 mt-1 block font-mono">{n.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Connected Wallet Dropdown */}
            {walletAddress ? (
              <div className="relative">
                <button
                  onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white font-mono hover:bg-white/10 transition-colors"
                >
                  <span className="text-[9px] bg-brandLime/10 text-brandLime px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    {walletProvider || "FREIGHTER"}
                  </span>
                  <span>{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
                  <ChevronDown className="size-3 text-brandGray" />
                </button>

                {walletDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/5 bg-[#121316]/95 backdrop-blur-xl p-2 shadow-2xl z-50 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(walletAddress);
                        alert("Address copied to clipboard!");
                        setWalletDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-left text-xs text-[#9fadaa] hover:text-white hover:bg-white/5 rounded-xl transition-all w-full"
                    >
                      <Copy className="size-3.5" />
                      Copy Address
                    </button>
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 text-left text-xs text-[#9fadaa] hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                      <ExternalLink className="size-3.5" />
                      Stellar Expert
                    </a>
                    <div className="h-px bg-white/5 my-1" />
                    <button
                      onClick={() => {
                        disconnect();
                        setWalletDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/5 rounded-xl transition-all w-full"
                    >
                      <LogOut className="size-3.5" />
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-brandLime text-brandDark font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(212,255,63,0.15)] hover:scale-[1.02] transition-transform"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>

        {/* Central Content Panel */}
        <main className="p-8 pb-24 md:pb-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* ────────────────────────────────────────────────────────
                  1. OVERVIEW / PORTFOLIO VIEW
                  ──────────────────────────────────────────────────────── */}
              {activeSection === "portfolio" && (
                <div className="flex flex-col gap-6">
                  {/* KPI Bar */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/50 shadow-lg flex flex-col gap-1.5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 opacity-[0.03] pointer-events-none"><Wallet className="size-16" /></div>
                      <span className="text-[10px] font-bold uppercase text-brandGray tracking-wider">Supplied Balance</span>
                      <p className="text-2xl font-bold font-mono text-white">${totals.suppliedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <span className="text-[10px] text-brandLime font-semibold flex items-center gap-1 mt-2">
                        <ArrowUpRight className="size-3" /> Net Yield Active
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/50 shadow-lg flex flex-col gap-1.5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 opacity-[0.03] pointer-events-none"><Sliders className="size-16" /></div>
                      <span className="text-[10px] font-bold uppercase text-brandGray tracking-wider">Borrowed Balance</span>
                      <p className="text-2xl font-bold font-mono text-white">${totals.borrowedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <span className="text-[10px] text-brandGray mt-2">Max LTV: 75%</span>
                    </div>

                    <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/50 shadow-lg flex flex-col gap-1.5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 opacity-[0.03] pointer-events-none"><TrendingUp className="size-16" /></div>
                      <span className="text-[10px] font-bold uppercase text-brandGray tracking-wider">Net Supply APY</span>
                      <p className="text-2xl font-bold font-mono text-white">+{avgApy}%</p>
                      <span className="text-[10px] text-[#7c3aed] font-semibold flex items-center gap-1 mt-2">
                        <Plus className="size-3" /> Includes ERGO rewards
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/50 shadow-lg flex flex-col gap-1.5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 opacity-[0.03] pointer-events-none"><Shield className="size-16" /></div>
                      <span className="text-[10px] font-bold uppercase text-brandGray tracking-wider">Borrow Health Factor</span>
                      <p className={`text-2xl font-bold font-mono ${
                        totals.healthFactor <= 1.2 ? "text-red-500" : totals.healthFactor <= 2.0 ? "text-amber-500" : "text-brandLime"
                      }`}>{totals.healthFactor > 50 ? "Infinite" : totals.healthFactor}</p>
                      <div className="flex items-center gap-1 mt-2 group/tooltip relative cursor-help">
                        <span className="text-[10px] text-brandGray">Liquidation Limit: 1.00</span>
                        <HelpCircle className="size-3 text-brandGray/40" />
                        <div className="absolute bottom-6 left-0 w-48 p-2 rounded-lg bg-[#14151a] border border-white/5 text-[9px] text-[#9fadaa] leading-normal opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity z-20 shadow-xl">
                          Liquidation occurs at 1.00. Your position is liquidated when collateral value / debt value falls below this threshold.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* E-Mode & Credit Delegation Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* E-Mode Controller */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>Efficiency Mode (E-Mode)</span>
                            <span className="text-[9px] bg-brandLime/15 text-brandLime px-2 py-0.5 rounded font-bold">Category 1 Active</span>
                          </h4>
                          <button
                            onClick={() => {
                              if (!emodeEnabled) {
                                setShowEmodeConfirm(true);
                              } else {
                                setEmodeEnabled(false);
                              }
                            }}
                            className={`w-10 h-6 rounded-full transition-all relative ${emodeEnabled ? "bg-brandLime" : "bg-white/10"}`}
                          >
                            <div className={`absolute top-1 size-4 rounded-full bg-black transition-all ${emodeEnabled ? "translate-x-5" : "translate-x-1"}`} />
                          </button>
                        </div>
                        <p className="text-[10px] text-brandGray mt-1 leading-relaxed">
                          Enabling E-Mode boosts your LTV threshold to 90% when supplying and borrowing highly correlated stable assets (USDC, EURC).
                        </p>
                      </div>
                      <div className="flex justify-between text-xs border-t border-white/5 pt-3">
                        <span className="text-brandGray">Current Collateral Factor:</span>
                        <span className="font-bold font-mono text-brandLime">{emodeEnabled ? "90%" : "75%"} (Max LTV Boost)</span>
                      </div>
                    </div>

                    {/* Credit Delegation Panel */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">Credit Delegation Panel</h4>
                        <p className="text-[10px] text-brandGray mt-1 leading-relaxed">
                          Delegate your unused borrow limit to a designated Stellar address, allowing them to draw credit backed by your collateral.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Stellar address (G...)"
                          value={delegationAddress}
                          onChange={(e) => setDelegationAddress(e.target.value)}
                          className="flex-1 bg-[#121316] border border-white/5 focus:border-[#7c3aed]/40 rounded-xl px-3 py-2 text-xs text-white placeholder-brandGray/40 outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Limit ($)"
                          value={delegationLimit}
                          onChange={(e) => setDelegationLimit(e.target.value)}
                          className="w-20 bg-[#121316] border border-white/5 focus:border-[#7c3aed]/40 rounded-xl px-3 py-2 text-xs text-white placeholder-brandGray/40 outline-none font-mono"
                        />
                        <button
                          onClick={() => {
                            if (!delegationAddress) return alert("Please specify a delegate address.");
                            setActiveDelegations(prev => [
                              ...prev,
                              { address: delegationAddress, limit: Number(delegationLimit), status: "Active" }
                            ]);
                            setDelegationAddress("");
                            alert("Credit delegated successfully!");
                          }}
                          className="px-4 py-2 bg-brandLime hover:bg-brandLime/90 text-brandDark font-bold text-xs rounded-xl transition-all"
                        >
                          Delegate
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 max-h-16 overflow-y-auto">
                        {activeDelegations.map((d, i) => (
                          <div key={i} className="flex justify-between items-center text-[10px] font-mono border-b border-white/5 pb-1">
                            <span className="text-brandGray truncate max-w-[150px]">{d.address}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white">${d.limit} USDC</span>
                              <button
                                onClick={() => {
                                  setActiveDelegations(prev => prev.filter((_, idx) => idx !== i));
                                  alert("Credit delegation revoked successfully.");
                                }}
                                className="text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded bg-red-500/10 transition-colors"
                              >
                                Revoke
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Main Charts & Allocation */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Area Chart */}
                    <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-[#121316]/30">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h4 className="text-sm font-bold text-white">Lending Capital Growth</h4>
                          <p className="text-[10px] text-brandGray mt-0.5">Yield performance over last 6 periods</p>
                        </div>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={[
                            { month: "Jan", supplied: 5200, borrowed: 1000 },
                            { month: "Feb", supplied: 6400, borrowed: 1500 },
                            { month: "Mar", supplied: 7200, borrowed: 1200 },
                            { month: "Apr", supplied: 8800, borrowed: 2000 },
                            { month: "May", supplied: 9200, borrowed: 2500 },
                            { month: "Jun", supplied: 9650, borrowed: 2500 },
                          ]}>
                            <defs>
                              <linearGradient id="suppliedGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={C.lime} stopOpacity={0.2} />
                                <stop offset="100%" stopColor={C.lime} stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="borrowedGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={C.purple} stopOpacity={0.15} />
                                <stop offset="100%" stopColor={C.purple} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.grey }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: C.grey }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: C.card, border: "none", borderRadius: "1rem" }} />
                            <Area type="monotone" dataKey="supplied" stroke={C.lime} strokeWidth={2.5} fill="url(#suppliedGrad)" name="Supplied" />
                            <Area type="monotone" dataKey="borrowed" stroke={C.purple} strokeWidth={2} fill="url(#borrowedGrad)" name="Borrowed" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Donut Allocation */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">Collateral Allocation</h4>
                        <p className="text-[10px] text-brandGray mt-0.5">Asset shares inside non-custodial lockup</p>
                      </div>
                      <div className="h-44 flex items-center justify-center mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={assetPools.filter(p => p.supplied > 0).map(p => ({
                                name: p.symbol,
                                value: p.supplied * prices[p.id],
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius="50%"
                              outerRadius="75%"
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill={C.lime} />
                              <Cell fill={C.purple} />
                              <Cell fill="#f5f5f2" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col gap-2 mt-4">
                        {assetPools.filter(p => p.supplied > 0).map((pool, idx) => (
                          <div key={pool.id} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <div className="size-2.5 rounded-full" style={{ backgroundColor: idx === 0 ? C.lime : idx === 1 ? C.purple : "#f5f5f2" }} />
                              <span className="text-brandGray">{pool.name}</span>
                            </div>
                            <span className="font-mono text-white font-bold">{pool.supplied} {pool.symbol}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Supplied and Borrowed assets tables */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Supplied Assets */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30">
                      <h4 className="text-sm font-bold text-white mb-4">My Supplied Balances</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-brandGray border-b border-white/5 pb-2">
                              <th className="pb-2 font-medium">Asset</th>
                              <th className="pb-2 text-right font-medium">Balance</th>
                              <th className="pb-2 text-right font-medium">APY</th>
                              <th className="pb-2 text-center font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assetPools.filter(p => p.supplied > 0).map(pool => (
                              <tr key={pool.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-3 flex items-center gap-2">
                                  <span className="text-lg">{pool.logo}</span>
                                  <span className="font-bold text-white font-mono">{pool.symbol}</span>
                                </td>
                                <td className="py-3 text-right font-mono text-white">{pool.supplied.toLocaleString()}</td>
                                <td className="py-3 text-right font-mono text-brandLime">+{pool.supplyApy}%</td>
                                <td className="py-3 text-center">
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      onClick={() => {
                                        setSelectedAssetId(pool.id);
                                        setTxType("supply");
                                        setIsTxModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 rounded bg-[#d4ff3f]/10 text-brandLime border border-[#d4ff3f]/10 font-bold hover:bg-[#d4ff3f]/15"
                                    >
                                      Supply
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedAssetId(pool.id);
                                        setTxType("withdraw");
                                        setIsTxModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 rounded bg-white/5 text-white border border-white/5 font-bold hover:bg-white/10"
                                    >
                                      Withdraw
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Borrowed Assets */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30">
                      <h4 className="text-sm font-bold text-white mb-4">My Borrowed Balances</h4>
                      {totals.borrowedUSD > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="text-brandGray border-b border-white/5 pb-2">
                                <th className="pb-2 font-medium">Asset</th>
                                <th className="pb-2 text-right font-medium">Balance</th>
                                <th className="pb-2 text-right font-medium">APY</th>
                                <th className="pb-2 text-center font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assetPools.filter(p => p.borrowed > 0).map(pool => (
                                <tr key={pool.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-3 flex items-center gap-2">
                                    <span className="text-lg">{pool.logo}</span>
                                    <span className="font-bold text-white font-mono">{pool.symbol}</span>
                                  </td>
                                  <td className="py-3 text-right font-mono text-white">{pool.borrowed.toLocaleString()}</td>
                                  <td className="py-3 text-right font-mono text-brandPurple">+{pool.borrowApy}%</td>
                                  <td className="py-3 text-center">
                                    <div className="flex gap-2 justify-center">
                                      <button
                                        onClick={() => {
                                          setSelectedAssetId(pool.id);
                                          setTxType("borrow");
                                          setIsTxModalOpen(true);
                                        }}
                                        className="px-2.5 py-1 rounded bg-[#7c3aed]/10 text-brandPurple border border-[#7c3aed]/15 font-bold hover:bg-[#7c3aed]/15"
                                      >
                                        Borrow
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedAssetId(pool.id);
                                          setTxType("repay");
                                          setIsTxModalOpen(true);
                                        }}
                                        className="px-2.5 py-1 rounded bg-white/5 text-white border border-white/5 font-bold hover:bg-white/10"
                                      >
                                        Repay
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-28 text-center text-brandGray/50 border border-dashed border-white/5 rounded-xl">
                          <p>No active borrows. Click Markets to borrow assets against your collateral.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  2. LENDING POOLS / MARKETS VIEW
                  ──────────────────────────────────────────────────────── */}
              {activeSection === "market" && (
                <div className="flex flex-col gap-6">
                  <div className="rounded-2xl border border-white/5 bg-[#121316]/50 p-6">
                    <h3 className="text-base font-bold text-white">Stellar Shared Liquidity Core & Satellite Pools</h3>
                    <p className="text-xs text-brandGray mt-1">Lend or borrow assets with non-custodial Dutch liquidation security.</p>
                  </div>

                  {/* Shared Liquidity Core Section */}
                  <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-[#d4ff3f] uppercase tracking-wider pl-1">Shared Liquidity Core</h4>
                    {assetPools
                      .filter(p => p.id === "usdc" || p.id === "eurc")
                      .map(pool => {
                        const poolType = pool.id === "usdc" ? "SHARED CORE" : "PERMISSIONED";
                        const isExpanded = !!expandedPools[pool.id];
                        return (
                          <div key={pool.id} className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4 hover:scale-[1.005] transition-transform duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="flex items-center gap-3.5">
                                <span className="text-3xl">{pool.logo}</span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-base font-bold text-white font-mono">{pool.symbol}</h4>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                      poolType === "SHARED CORE" ? "bg-[#d4ff3f]/10 text-[#d4ff3f] border border-[#d4ff3f]/20" :
                                      "bg-white/5 text-white border border-white/20"
                                    }`}>
                                      {poolType}
                                    </span>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                      E-Mode: 90% LTV
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-brandGray font-sans">{pool.name}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full md:w-auto">
                                <div>
                                  <span className="text-[10px] text-brandGray uppercase tracking-wider block">Total Supply</span>
                                  <span className="text-sm font-bold text-white font-mono">${(pool.tvl * prices[pool.id]).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-brandGray uppercase tracking-wider block">Total Borrow</span>
                                  <span className="text-sm font-bold text-white font-mono">${(pool.totalBorrowed * prices[pool.id]).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-brandGray uppercase tracking-wider block">Supply APY</span>
                                  <span className="text-sm font-bold text-brandLime font-mono">+{pool.supplyApy}%</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-brandGray uppercase tracking-wider block">Borrow APY</span>
                                  <span className="text-sm font-bold text-brandPurple font-mono">+{pool.borrowApy}%</span>
                                </div>
                              </div>

                              <div className="flex gap-2 shrink-0 w-full md:w-auto">
                                <button
                                  onClick={() => {
                                    setExpandedPools(prev => ({ ...prev, [pool.id]: !prev[pool.id] }));
                                  }}
                                  className="px-3.5 py-2.5 rounded-xl border border-white/5 text-xs text-brandGray hover:text-white hover:bg-white/5"
                                >
                                  {isExpanded ? "Hide Details" : "Details"}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAssetId(pool.id);
                                    setTxType("supply");
                                    setIsTxModalOpen(true);
                                  }}
                                  className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-brandLime text-brandDark font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(212,255,63,0.15)] hover:scale-[1.02] transition-transform"
                                >
                                  Supply
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAssetId(pool.id);
                                    setTxType("borrow");
                                    setIsTxModalOpen(true);
                                  }}
                                  className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl border border-white/10 text-white font-bold text-xs tracking-wider hover:bg-white/5 transition-colors"
                                >
                                  Borrow
                                </button>
                              </div>
                            </div>

                            {/* Collapsible Details Drawer */}
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                className="border-t border-white/5 pt-4 mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs"
                              >
                                <div>
                                  <span className="text-brandGray block mb-1 text-[10px] uppercase">Risk Parameters</span>
                                  <span className="text-white font-mono block">Collateral Factor: {pool.collateralFactor}%</span>
                                  <span className="text-brandGray block text-[10px]">Liq. Threshold: {pool.collateralFactor + 5}%</span>
                                </div>
                                <div>
                                  <span className="text-brandGray block mb-1 text-[10px] uppercase">Oracle Feeds</span>
                                  <span className="text-white block font-semibold">Reflector + DEX TWAP</span>
                                  <span className="text-brandGray block text-[10px]">Updated: 2 ledgers ago</span>
                                </div>
                                <div>
                                  <span className="text-brandGray block mb-1 text-[10px] uppercase">Circuit Breaker</span>
                                  <span className="text-brandLime font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brandLime animate-pulse" /> Active & Healthy
                                  </span>
                                </div>
                                <div>
                                  <span className="text-brandGray block mb-1 text-[10px] uppercase">Backstop Coverage</span>
                                  <span className="text-white font-mono block">142% funded</span>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Isolated Satellite Pools Section */}
                  <div className="flex flex-col gap-4 mt-4">
                    <h4 className="text-xs font-bold text-[#7c3aed] uppercase tracking-wider pl-1">Isolated Satellite Pools</h4>
                    {assetPools
                      .filter(p => p.id === "xlm" || p.id === "ergo")
                      .map(pool => {
                        const poolType = "SATELLITE";
                        const isExpanded = !!expandedPools[pool.id];
                        const debtCeiling = pool.id === "xlm" ? 5000000 : 2500000;
                        const ceilingPercent = Math.min((pool.totalBorrowed / debtCeiling) * 100, 100);
                        return (
                          <div key={pool.id} className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-5 hover:scale-[1.005] transition-transform duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="flex items-center gap-3.5">
                                <span className="text-3xl">{pool.logo}</span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-base font-bold text-white font-mono">{pool.symbol}</h4>
                                    <span className="bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                      {poolType}
                                    </span>
                                    {pool.id === "xlm" && (
                                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        E-Mode: 90% LTV
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-brandGray font-sans">{pool.name}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full md:w-auto">
                                <div>
                                  <span className="text-[10px] text-brandGray uppercase tracking-wider block">Total Supply</span>
                                  <span className="text-sm font-bold text-white font-mono">${(pool.tvl * prices[pool.id]).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-brandGray uppercase tracking-wider block">Total Borrow</span>
                                  <span className="text-sm font-bold text-white font-mono">${(pool.totalBorrowed * prices[pool.id]).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-brandGray uppercase tracking-wider block">Supply APY</span>
                                  <span className="text-sm font-bold text-brandLime font-mono">+{pool.supplyApy}%</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-brandGray uppercase tracking-wider block">Borrow APY</span>
                                  <span className="text-sm font-bold text-brandPurple font-mono">+{pool.borrowApy}%</span>
                                </div>
                              </div>

                              <div className="flex gap-2 shrink-0 w-full md:w-auto">
                                <button
                                  onClick={() => {
                                    setExpandedPools(prev => ({ ...prev, [pool.id]: !prev[pool.id] }));
                                  }}
                                  className="px-3.5 py-2.5 rounded-xl border border-white/5 text-xs text-brandGray hover:text-white hover:bg-white/5"
                                >
                                  {isExpanded ? "Hide Details" : "Details"}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAssetId(pool.id);
                                    setTxType("supply");
                                    setIsTxModalOpen(true);
                                  }}
                                  className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-brandLime text-brandDark font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(212,255,63,0.15)] hover:scale-[1.02] transition-transform"
                                >
                                  Supply
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAssetId(pool.id);
                                    setTxType("borrow");
                                    setIsTxModalOpen(true);
                                  }}
                                  className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl border border-white/10 text-white font-bold text-xs tracking-wider hover:bg-white/5 transition-colors"
                                >
                                  Borrow
                                </button>
                              </div>
                            </div>

                            {/* Debt Ceiling Progress Bar */}
                            <div className="border-t border-white/5 pt-3.5 flex flex-col gap-1.5">
                              <div className="flex justify-between text-[10px] text-brandGray">
                                <span>Debt Used: <span className="font-mono text-white">${pool.totalBorrowed.toLocaleString()} / ${debtCeiling.toLocaleString()} cap</span></span>
                                <span className="font-mono text-[#7c3aed] font-bold">{ceilingPercent.toFixed(1)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-[#7c3aed]" style={{ width: `${ceilingPercent}%` }} />
                              </div>
                            </div>

                            {/* Collapsible Details Drawer */}
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                className="border-t border-white/5 pt-2 mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs"
                              >
                                <div>
                                  <span className="text-brandGray block mb-1 text-[10px] uppercase">Risk Parameters</span>
                                  <span className="text-white font-mono block">Collateral Factor: {pool.collateralFactor}%</span>
                                  <span className="text-brandGray block text-[10px]">Liq. Threshold: {pool.collateralFactor + 5}%</span>
                                </div>
                                <div>
                                  <span className="text-brandGray block mb-1 text-[10px] uppercase">Oracle Feeds</span>
                                  <span className="text-white block font-semibold">Reflector + DEX TWAP</span>
                                  <span className="text-brandGray block text-[10px]">Updated: 2 ledgers ago</span>
                                </div>
                                <div>
                                  <span className="text-brandGray block mb-1 text-[10px] uppercase">Circuit Breaker</span>
                                  <span className="text-brandLime font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brandLime animate-pulse" /> Active & Healthy
                                  </span>
                                </div>
                                <div>
                                  <span className="text-brandGray block mb-1 text-[10px] uppercase">Backstop Coverage</span>
                                  <span className="text-white font-mono block">120% funded</span>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  3. YIELD ATTRIBUTION / PERFORMANCE VIEW
                  ──────────────────────────────────────────────────────── */}
              {activeSection === "performance" && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label="Staking Balance" value="450" suffix=" ERGO" delay={0} icon={Award} />
                    <KpiCard label="Accumulated Rewards" value="24.50" suffix=" ERGO" delay={0.06} icon={TrendingUp} />
                    <KpiCard label="Aggregated Yield Rate" value={avgApy.toString()} suffix="%" delay={0.12} icon={ArrowUpRight} />
                    <KpiCard label="Liquidity Contributed" value={totals.suppliedUSD.toString()} prefix="$" delay={0.18} icon={Wallet} />
                  </div>

                  <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h4 className="text-sm font-bold text-white">Interest Paid vs Interest Earned</h4>
                        <p className="text-[10px] text-brandGray">Historical performance metrics</p>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-2"><div className="size-2.5 rounded-full bg-brandLime" /><span className="text-brandGray">Yield Earned</span></div>
                        <div className="flex items-center gap-2"><div className="size-2.5 rounded-full bg-brandPurple" /><span className="text-brandGray">Interest Paid</span></div>
                      </div>
                    </div>

                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { month: "Jan", earned: 120, paid: 25 },
                          { month: "Feb", earned: 180, paid: 40 },
                          { month: "Mar", earned: 210, paid: 35 },
                          { month: "Apr", earned: 290, paid: 60 },
                          { month: "May", earned: 310, paid: 75 },
                          { month: "Jun", earned: 345, paid: 75 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.grey }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: C.grey }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: C.card, border: "none", borderRadius: "1rem" }} />
                          <Bar dataKey="earned" name="Earned APY Yield" fill={C.lime} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="paid" name="Paid Borrow APY" fill={C.purple} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  4. RISK CONTROLS VIEW (Simulator LTV controls)
                  ──────────────────────────────────────────────────────── */}
              {activeSection === "risk" && (
                <div className="flex flex-col gap-6">
                  {/* Danger Indicator warnings */}
                  {totals.healthFactor < 1.1 && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-5 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-200 flex gap-4 items-center"
                    >
                      <AlertTriangle className="size-6 text-red-500 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider">Critical Risk State: Liquidation Alert</h4>
                        <p className="text-xs text-red-300 mt-1">Your simulated collateral value has dropped below safe threshold parameter values. Healthy factor is currently {totals.healthFactor}. Increase supplied collateral balance to avoid automatic dutch auction liquidations.</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Collateral Factor & Health Factor Simulator */}
                    <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col justify-between gap-6">
                      <div>
                        <h4 className="text-sm font-bold text-white">Collateral Volatility Simulator</h4>
                        <p className="text-[10px] text-brandGray mt-0.5">Drag the slider to simulate price drop events and check Health Factor variations.</p>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-brandGray">Collateral Value Deviation</span>
                          <span className={`font-bold font-mono ${simulatedCollateralOffset < 0 ? "text-red-500" : "text-brandLime"}`}>
                            {simulatedCollateralOffset >= 0 ? "+" : ""}{simulatedCollateralOffset.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-1800"
                          max="1800"
                          step="10"
                          value={simulatedCollateralOffset}
                          onChange={(e) => setSimulatedCollateralOffset(parseFloat(e.target.value))}
                          className="w-full accent-brandLime cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-brandGray/40">
                          <span>- $1,800 (-85% drop)</span>
                          <span>Baseline ($0.00 offset)</span>
                          <span>+ $1,800 (+85% gain)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 border-t border-white/5 pt-4">
                        <div>
                          <span className="text-[10px] text-brandGray uppercase tracking-wider block">Simulated LTV Ratio</span>
                          <span className="text-lg font-bold font-mono text-white">{totals.ltv}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-brandGray uppercase tracking-wider block">Simulated Health Factor</span>
                          <span className={`text-lg font-bold font-mono ${totals.healthFactor < 1.1 ? "text-red-500 font-bold" : totals.healthFactor < 1.5 ? "text-amber-500 font-bold" : "text-brandLime"}`}>
                            {totals.healthFactor > 50 ? "Infinite" : totals.healthFactor}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Backstop Insurance Metrics */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">Backstop Insurance Reserves</h4>
                        <p className="text-[10px] text-brandGray mt-0.5">Insurance capital locked to recover protocol shortfalls.</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-brandGray">USDC Pool Capital</span>
                          <span className="font-bold text-white font-mono">$524,000 USDC</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-brandGray">Queued Withdrawals</span>
                          <span className="font-bold text-white font-mono">$12,450 USDC</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-brandGray">Cooldown Duration</span>
                          <span className="font-bold text-brandLime font-mono">10 Ledgers (Testnet)</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-brandGray">Active Drawdown Gate</span>
                          <span className="text-[10px] bg-brandLime/10 text-brandLime px-2 py-0.5 rounded font-bold border border-brandLime/15">CLOSED</span>
                        </div>
                      </div>

                      <div className="h-px bg-white/5 w-full" />
                      <button
                        onClick={() => {
                          setSelectedAssetId("usdc");
                          setTxType("supply");
                          setIsTxModalOpen(true);
                        }}
                        className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-bold text-white hover:bg-white/5 transition-all text-center"
                      >
                        Deposit Backstop Capital
                      </button>
                    </div>
                  </div>

                  {/* Liquidation Auction Monitor & Oracle Feeds Panels */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Auction Monitor */}
                    <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">Liquidation Auction Monitor</h4>
                        <p className="text-[10px] text-brandGray mt-0.5">Dutch auction progress curves for unhealthy loans.</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-brandGray border-b border-white/5 pb-2">
                              <th className="pb-2">Borrower</th>
                              <th className="pb-2">Debt to Clear</th>
                              <th className="pb-2">Collateral Reward</th>
                              <th className="pb-2">Dutch Discount</th>
                              <th className="pb-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-3 font-mono text-white">GD3F...9K12</td>
                              <td className="py-3 font-mono text-red-400">1,500 USDC</td>
                              <td className="py-3 font-mono text-brandLime">12,500 XLM</td>
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-brandLime" style={{ width: "65%" }} />
                                  </div>
                                  <span className="font-mono text-[10px] text-brandLime font-bold">6.5%</span>
                                </div>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => {
                                    alert("Arbitrage flash-loan liquidation request submitted to keeper node!");
                                  }}
                                  className="px-2.5 py-1 rounded bg-[#d4ff3f]/10 text-brandLime border border-[#d4ff3f]/10 font-bold hover:bg-[#d4ff3f]/15"
                                >
                                  Execute Fill
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Oracle Deviation Panel */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">Oracle Deviation Feeds</h4>
                        <p className="text-[10px] text-brandGray mt-0.5">Aggregated price feed variance limits.</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {[
                          { asset: "USDC / USD", reflector: "$1.000", twap: "$1.001", dev: "0.10%", status: "Safe" },
                          { asset: "XLM / USD", reflector: "$0.112", twap: "$0.111", dev: "0.89%", status: "Safe" },
                          { asset: "EURC / USD", reflector: "$1.080", twap: "$1.077", dev: "0.27%", status: "Safe" }
                        ].map((o, idx) => (
                          <div key={idx} className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-white">{o.asset}</span>
                              <span className="text-[9px] bg-brandLime/15 text-brandLime px-1.5 py-0.5 rounded font-bold">{o.status}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-brandGray">
                              <span>Reflector: <span className="font-mono text-white">{o.reflector}</span></span>
                              <span>TWAP: <span className="font-mono text-white">{o.twap}</span></span>
                              <span>Var: <span className="font-mono text-brandLime">{o.dev}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  5. TRANSACTION LOG VIEW
                  ──────────────────────────────────────────────────────── */}
              {activeSection === "transactions" && (
                <div className="flex flex-col gap-6">
                  <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h4 className="text-sm font-bold text-white">Recent Transaction Ledger</h4>
                        <p className="text-[10px] text-brandGray">Live verified transaction hashes on Stellar</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-brandGray border-b border-white/5 pb-2">
                            <th className="pb-2">Type</th>
                            <th className="pb-2">Asset</th>
                            <th className="pb-2 text-right">Amount</th>
                            <th className="pb-2 text-right">Tx Hash</th>
                            <th className="pb-2 text-right">Explorer</th>
                            <th className="pb-2 text-right">Date & Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map(tx => (
                            <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-3">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded ${
                                  tx.type === "SUPPLY" || tx.type === "REPAY" ? "bg-brandLime/10 text-brandLime" : "bg-brandPurple/10 text-brandPurple"
                                }`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="py-3 font-bold font-mono text-white">{tx.asset}</td>
                              <td className="py-3 text-right font-mono text-white">{tx.amount.toLocaleString()}</td>
                              <td className="py-3 text-right font-mono text-brandGray/70">{tx.hash}</td>
                              <td className="py-3 text-right text-brandLime hover:underline">
                                <a href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">
                                  View
                                </a>
                              </td>
                              <td className="py-3 text-right font-mono text-brandGray/50">{tx.date} <span className="opacity-50">{tx.time}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  6. GOVERNANCE proposals list
                  ──────────────────────────────────────────────────────── */}
              {activeSection === "governance" && (
                <div className="flex flex-col gap-6">
                  {/* KPI Bar */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/50 shadow-lg flex flex-col gap-1.5 relative overflow-hidden group">
                      <span className="text-[10px] font-bold uppercase text-brandGray tracking-wider">My Voting Power</span>
                      <p className="text-2xl font-bold font-mono text-white">2,500 ERGO</p>
                      <span className="text-[10px] text-brandLime font-semibold flex items-center gap-1 mt-2">
                        Staked in Governance
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/50 shadow-lg flex flex-col gap-1.5 relative overflow-hidden group">
                      <span className="text-[10px] font-bold uppercase text-brandGray tracking-wider">Active proposals</span>
                      <p className="text-2xl font-bold font-mono text-white">2 Proposals</p>
                      <span className="text-[10px] text-brandGray mt-2">Active validation period</span>
                    </div>

                    <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/50 shadow-lg flex flex-col gap-1.5 relative overflow-hidden group">
                      <span className="text-[10px] font-bold uppercase text-brandGray tracking-wider">Proposals Executed</span>
                      <p className="text-2xl font-bold font-mono text-white">10 ERPs</p>
                      <span className="text-[10px] text-brandGray mt-2">Soroban contract updates</span>
                    </div>

                    <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/50 shadow-lg flex flex-col gap-1.5 relative overflow-hidden group">
                      <span className="text-[10px] font-bold uppercase text-brandGray tracking-wider">Staking rewards</span>
                      <p className="text-2xl font-bold font-mono text-white">+8.45% APY</p>
                      <span className="text-[10px] text-brandLime mt-2">Auto-compound yield</span>
                    </div>
                  </div>

                  {/* Header and Create Button */}
                  <div className="flex justify-between items-center bg-[#121316]/40 p-6 rounded-2xl border border-white/5">
                    <div>
                      <h3 className="text-base font-bold text-white">Stellar Governance Dashboard</h3>
                      <p className="text-xs text-brandGray mt-1">Vote on risk parameters, Oracle feeds, and smart contract execution limits.</p>
                    </div>
                    <button
                      onClick={() => setIsCreatePropModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-brandLime text-brandDark font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(212,255,63,0.15)] hover:scale-[1.02] transition-transform flex items-center gap-1.5"
                    >
                      <Plus className="size-4" /> Create Proposal
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Active proposals list */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                      <h4 className="text-xs font-bold text-brandGray uppercase tracking-wider">Active Governance Proposals</h4>
                      {proposals.map(prop => (
                        <div key={prop.id} className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4 hover:scale-[1.005] transition-transform duration-300">
                          <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold font-mono bg-brandPurple/20 text-[#7c3aed] px-2 py-0.5 rounded">{prop.id}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${prop.status === "Active" ? "bg-brandLime/10 text-brandLime" : "bg-white/5 text-brandGray"}`}>{prop.status}</span>
                            </div>
                            <span className="text-[10px] font-mono text-brandGray/40">Ends in: {prop.endsIn}</span>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-white">{prop.title}</h4>
                            <p className="text-xs text-[#9fadaa] mt-1.5 leading-relaxed">{prop.description}</p>
                            <span className="text-[10px] text-brandGray/40 mt-2 block">Proposer: {prop.proposer}</span>
                          </div>

                          {/* Voting visual bar graphs */}
                          <div className="flex flex-col gap-2 mt-2">
                            <div className="flex justify-between text-[10px] font-mono font-bold">
                              <span className="text-brandLime">For: {prop.votesFor.toLocaleString()} ERGO ({(prop.votesFor / (prop.votesFor + prop.votesAgainst) * 100).toFixed(0)}%)</span>
                              <span className="text-red-400">Against: {prop.votesAgainst.toLocaleString()} ERGO ({(prop.votesAgainst / (prop.votesFor + prop.votesAgainst) * 100).toFixed(0)}%)</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden flex">
                              <div className="h-full bg-brandLime" style={{ width: `${(prop.votesFor / (prop.votesFor + prop.votesAgainst) * 100)}%` }} />
                              <div className="h-full bg-red-500" style={{ width: `${(prop.votesAgainst / (prop.votesFor + prop.votesAgainst) * 100)}%` }} />
                            </div>
                          </div>

                          {/* Action buttons */}
                          {prop.status === "Active" && (
                            <div className="flex gap-3 mt-2 justify-end">
                              {prop.hasVoted ? (
                                <span className="text-xs bg-white/5 text-brandGray/60 px-4 py-2 border border-white/5 rounded-xl font-bold flex items-center gap-1.5">
                                  <Check className="size-3 text-brandLime" />
                                  Voted Successfully
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleVote(prop.id, true)}
                                    className="px-4 py-2 rounded-xl bg-brandLime/10 hover:bg-brandLime/15 text-brandLime border border-[#d4ff3f]/10 font-bold text-xs"
                                  >
                                    Vote For
                                  </button>
                                  <button
                                    onClick={() => handleVote(prop.id, false)}
                                    className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/10 font-bold text-xs"
                                  >
                                    Vote Against
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Timelock Queue Column */}
                    <div className="flex flex-col gap-4">
                      <h4 className="text-xs font-bold text-brandGray uppercase tracking-wider">Timelock Execution Queue</h4>
                      <div className="flex flex-col gap-4">
                        {timelockQueue.map((item, idx) => (
                          <div key={idx} className="p-5 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                              <span className="text-[10px] font-bold font-mono bg-brandPurple/20 text-[#7c3aed] px-2 py-0.5 rounded">{item.id}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                item.status === "Queued" ? "bg-amber-500/10 text-amber-500 border border-amber-500/15" : "bg-brandLime/10 text-brandLime border border-brandLime/15"
                              }`}>{item.status}</span>
                            </div>

                            <div>
                              <h5 className="text-xs font-bold text-white">{item.title}</h5>
                              <div className="flex flex-col gap-1 mt-2 text-[10px] font-mono text-brandGray">
                                <span>Target: <span className="text-white">{item.targetContract}</span></span>
                                <span>Action: <span className="text-brandLime">{item.actionName}</span></span>
                                {item.status === "Queued" && (
                                  <span className="flex items-center gap-1 text-amber-400 mt-1.5 font-sans">
                                    <Clock className="size-3" /> Execution ETA: {item.eta}
                                  </span>
                                )}
                              </div>
                            </div>

                            {item.status === "Queued" && (
                              <button
                                onClick={() => {
                                  setTimelockQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "Executed" } : q));
                                  alert(`Successfully triggered Timelock execution for proposal ${item.id}! Smart contract parameters have been updated.`);
                                }}
                                className="w-full mt-2 py-2 rounded-xl bg-brandLime text-brandDark font-bold text-xs hover:bg-brandLime/90 transition-all text-center"
                              >
                                Execute Upgrade
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  7. SETTINGS PANEL VIEW
                  ──────────────────────────────────────────────────────── */}
              {activeSection === "settings" && (
                <div className="flex flex-col gap-6">
                  <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-6">
                    <div>
                      <h4 className="text-base font-bold text-white">Protocol Configuration Parameters</h4>
                      <p className="text-xs text-brandGray mt-1">Configure wallet settings, network modes, and multisig options.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-brandGray uppercase tracking-wider">Default Network</label>
                        <div className="flex items-center justify-between bg-[#121316] rounded-xl px-4 py-3 border border-white/5">
                          <span className="text-xs font-semibold text-white font-mono">Stellar Testnet (Soroban Active)</span>
                          <span className="text-[10px] bg-brandLime/15 text-brandLime px-2 py-0.5 rounded font-bold">Recommended</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-brandGray uppercase tracking-wider">Interface Language</label>
                        <div className="flex items-center justify-between bg-[#121316] rounded-xl px-4 py-3 border border-white/5">
                          <span className="text-xs font-semibold text-white">English (US)</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-white/5 my-2" />

                    <div className="flex flex-col gap-3">
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider">Risk notifications</h5>
                      {[
                        { label: "Dutch Auction Alerts", desc: "Notify when a liquidation auction initiates on your active borrow collateral.", active: true },
                        { label: "Oracle price deviation threshold", desc: "Alert when price feeds deviate by more than 2.00%.", active: true },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 text-xs">
                          <div>
                            <p className="font-semibold text-white">{item.label}</p>
                            <p className="text-[10px] text-brandGray mt-0.5 leading-relaxed">{item.desc}</p>
                          </div>
                          <div className="w-9 h-5 rounded-full relative cursor-pointer bg-brandLime">
                            <div className="absolute top-0.5 size-4 rounded-full bg-black translate-x-4.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ─── TRANSACTION DIALOG MODAL (SUPPLY/BORROW/REPAY/WITHDRAW) ─ */}
      <AnimatePresence>
        {isTxModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTxModalOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] border border-white/5 bg-[#0e0f12]/95 overflow-hidden shadow-2xl p-6 z-10 pb-12 md:pb-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsTxModalOpen(false)}
                className="absolute top-6 right-6 text-brandGray hover:text-white transition-colors z-20 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>

              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#7c3aed] font-semibold">{txType} Action</span>
                  <h4 className="text-xl font-bold text-white flex items-center gap-2 mt-1">
                    {activePool.logo} {activePool.name} ({activePool.symbol})
                  </h4>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-3">
                  <div className="flex justify-between text-xs text-brandGray">
                    <span>Available Balance:</span>
                    <span className="font-mono text-white">
                      {txType === "supply" || txType === "repay"
                        ? `${activePool.walletBalance.toLocaleString()} ${activePool.symbol}`
                        : `${activePool.supplied.toLocaleString()} ${activePool.symbol}`}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full bg-[#14151a] border border-white/5 focus:border-[#7c3aed]/40 focus:ring-1 focus:ring-[#7c3aed]/20 rounded-xl pl-4 pr-16 py-3.5 text-lg font-bold text-white placeholder-brandGray/40 outline-none transition-all"
                    />
                    <button
                      onClick={() => {
                        const val = txType === "supply" || txType === "repay" ? activePool.walletBalance : activePool.supplied;
                        setTxAmount(val.toString());
                      }}
                      className="absolute right-3.5 top-3.5 text-xs text-brandLime hover:underline font-bold"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Simulated dynamic risk parameters feedback */}
                {txAmount && !isNaN(parseFloat(txAmount)) && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-brandGray">Estimated Health Factor:</span>
                      <span className="font-mono text-brandLime font-bold">Stable</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brandGray">LTV Ratio updates:</span>
                      <span className="font-mono text-white">Safe margin</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleTxSubmit}
                  className="w-full py-4 rounded-2xl bg-brandLime hover:bg-brandLime/90 text-brandDark font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(212,255,63,0.15)] mt-2"
                >
                  Verify and Sign Transaction
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* E-Mode Activation Risk/Reward Confirmation Modal */}
      <AnimatePresence>
        {showEmodeConfirm && (
          <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmodeConfirm(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] border border-white/5 bg-[#0e0f12]/95 overflow-hidden shadow-2xl p-6 z-10 flex flex-col gap-5 pb-12 md:pb-6"
            >
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brandLime font-bold">Risk Confirmation</span>
                <h4 className="text-lg font-bold text-white mt-1">Activate Efficiency Mode (E-Mode)?</h4>
              </div>

              <div className="flex flex-col gap-3 text-xs leading-relaxed text-brandGray">
                <div className="p-4 rounded-xl bg-brandLime/5 border border-brandLime/10 text-brandLime">
                  <span className="font-bold block mb-1">🎁 Reward: Maximum Capital Efficiency</span>
                  Boosts collateral factor parameters for correlated assets (USDC, EURC) from 75% to <strong>90% maximum LTV limit</strong>.
                </div>

                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400">
                  <span className="font-bold block mb-1">⚠️ Risk: Price De-Peg Volatility</span>
                  If the relative price peg between Category 1 assets fluctuates, liquidation occurs significantly closer to the debt floor.
                </div>

                <p className="text-[10px] text-brandGray/60 mt-1">
                  By confirming, you execute a state update on your user position struct inside the Core Pool contract.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEmodeConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl border border-white/5 text-xs text-white hover:bg-white/5 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setEmodeEnabled(true);
                    setShowEmodeConfirm(false);
                    alert("E-Mode active on Core Pool! Your Stablecoin limits are now boosted to 90% LTV.");
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-brandLime hover:bg-brandLime/90 text-brandDark font-bold text-xs"
                >
                  Confirm & Activate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Multi-Step Proposal Creation Wizard Modal */}
      <AnimatePresence>
        {isCreatePropModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsCreatePropModalOpen(false);
                setWizardStep(1);
              }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] border border-white/5 bg-[#0e0f12]/95 overflow-hidden shadow-2xl p-6 z-10 flex flex-col gap-4 pb-12 md:pb-6"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setIsCreatePropModalOpen(false);
                  setWizardStep(1);
                }}
                className="absolute top-6 right-6 text-brandGray hover:text-white transition-colors z-20 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10"
              >
                <X className="size-4" />
              </button>

              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#7c3aed] font-semibold">Governance Wizard</span>
                <h4 className="text-xl font-bold text-white mt-1">
                  Create Proposal <span className="text-xs text-brandGray font-mono font-normal">Step {wizardStep} of 4</span>
                </h4>
              </div>

              {/* Wizard Step 1: Select Proposal Type */}
              {wizardStep === 1 && (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-brandGray uppercase tracking-wider block">Choose Proposal Type</span>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {[
                      { id: "MarketPauseResume", title: "Market Pause/Resume", desc: "Temporarily pause/resume supply & borrows.", fn: "CorePool::pause_market" },
                      { id: "OracleCircuitBreakerOverride", title: "Oracle Override", desc: "Modify oracle price feeds aggregation source.", fn: "OracleAggregator::register_feed" },
                      { id: "BackstopAllocationDecision", title: "Backstop Allocation", desc: "Adjust allocation ratios between pools.", fn: "Governance::set_allocation" },
                      { id: "CompliancePermissioning", title: "Compliance Allowlist", desc: "Update RWA institutional compliance parameters.", fn: "ComplianceModule::set_allowlist" },
                      { id: "RiskParamUpdate", title: "Risk Param Update", desc: "Update collateral factors and liability caps.", fn: "CorePool::update_market_params" },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          setProposalType(type.id);
                        }}
                        className={`p-3 rounded-xl border text-left flex flex-col transition-all gap-0.5 ${
                          proposalType === type.id ? "bg-brandPurple/10 border-[#7c3aed]/40 text-white" : "bg-white/5 border-white/5 text-brandGray hover:border-white/10"
                        }`}
                      >
                        <span className="text-xs font-bold text-white">{type.title}</span>
                        <span className="text-[10px] opacity-80">{type.desc}</span>
                        <span className="text-[9px] font-mono text-[#7c3aed] mt-1">{type.fn}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setWizardStep(2)}
                    className="w-full mt-2 py-3 rounded-xl bg-brandLime text-brandDark font-bold text-xs"
                  >
                    Next Step
                  </button>
                </div>
              )}

              {/* Wizard Step 2: Parameters Form */}
              {wizardStep === 2 && (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-brandGray uppercase tracking-wider block">Configure Parameters</span>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brandGray uppercase">Proposal Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Increase USDC Collateral Factor to 85%"
                      value={newPropTitle}
                      onChange={(e) => setNewPropTitle(e.target.value)}
                      className="w-full bg-[#14151a] border border-white/5 focus:border-[#7c3aed]/40 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brandGray uppercase">Target Contract Address</label>
                    <input
                      type="text"
                      placeholder="e.g. CC_POOL_CONTRACT_ADDRESS"
                      value={newPropTarget}
                      onChange={(e) => setNewPropTarget(e.target.value)}
                      className="w-full bg-[#14151a] border border-white/5 focus:border-[#7c3aed]/40 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brandGray uppercase">Action Method / Parameters</label>
                    <input
                      type="text"
                      placeholder="e.g. set_collateral_factor"
                      value={newPropAction}
                      onChange={(e) => setNewPropAction(e.target.value)}
                      className="w-full bg-[#14151a] border border-white/5 focus:border-[#7c3aed]/40 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brandGray uppercase">Detailed Description</label>
                    <textarea
                      placeholder="Rationale behind proposed changes..."
                      value={newPropDesc}
                      onChange={(e) => setNewPropDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-[#14151a] border border-white/5 focus:border-[#7c3aed]/40 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="flex-1 py-3 rounded-xl border border-white/5 text-xs text-white hover:bg-white/5"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        if (!newPropTitle || !newPropTarget || !newPropAction || !newPropDesc) {
                          return alert("Please fill in all parameter inputs.");
                        }
                        setWizardStep(3);
                      }}
                      className="flex-1 py-3 rounded-xl bg-brandLime text-brandDark font-bold text-xs"
                    >
                      Review payload
                    </button>
                  </div>
                </div>
              )}

              {/* Wizard Step 3: Review */}
              {wizardStep === 3 && (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-brandGray uppercase tracking-wider block">Review Execution Payload</span>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2 text-[10px] font-mono leading-relaxed">
                    <div>
                      <span className="text-brandGray block text-[9px]">TITLE:</span>
                      <span className="text-white">{newPropTitle}</span>
                    </div>
                    <div>
                      <span className="text-brandGray block text-[9px]">TARGET ADDRESS:</span>
                      <span className="text-white">{newPropTarget}</span>
                    </div>
                    <div>
                      <span className="text-brandGray block text-[9px]">METHOD:</span>
                      <span className="text-white">{newPropAction}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-2 mt-1">
                      <div>
                        <span className="text-brandGray block text-[9px]">TIMELOCK:</span>
                        <span className="text-amber-400 font-bold">48 Hours</span>
                      </div>
                      <div>
                        <span className="text-brandGray block text-[9px]">QUORUM:</span>
                        <span className="text-brandPurple font-bold">1,000,000 ERGO</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="flex-1 py-3 rounded-xl border border-white/5 text-xs text-white hover:bg-white/5"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        setWizardStep(4);
                        setTimeout(() => {
                          const newId = `ERP-${proposals.length + 11}`;
                          setProposals(prev => [
                            {
                              id: newId,
                              title: newPropTitle,
                              description: newPropDesc,
                              proposer: "GBXW...GOV8",
                              votesFor: 2500,
                              votesAgainst: 0,
                              hasVoted: true,
                              status: "Active",
                              endsIn: "5 days"
                            },
                            ...prev
                          ]);
                          alert(`Proposal ${newId} published on-chain successfully!`);
                          setIsCreatePropModalOpen(false);
                          setWizardStep(1);
                          setNewPropTitle("");
                          setNewPropTarget("");
                          setNewPropAction("");
                          setNewPropDesc("");
                        }, 2000);
                      }}
                      className="flex-1 py-3 rounded-xl bg-brandLime text-brandDark font-bold text-xs"
                    >
                      Sign & Submit
                    </button>
                  </div>
                </div>
              )}

              {/* Wizard Step 4: Submit Loader */}
              {wizardStep === 4 && (
                <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                  <div className="size-10 rounded-full border-2 border-brandLime border-t-transparent animate-spin" />
                  <div>
                    <h5 className="text-sm font-bold text-white">Signing with Freighter Wallet</h5>
                    <p className="text-xs text-brandGray mt-1">Please approve the transaction payload signature inside your wallet extension.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Stellar Connection Dialog helper */}
      <StellarWalletModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      {/* Bottom Tab Bar for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#121316]/95 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-around px-4 pb-safe">
        {[
          { id: "portfolio", label: "Portfolio", icon: Wallet },
          { id: "market", label: "Markets", icon: Globe },
          { id: "governance", label: "Governance", icon: CircleDot },
          { id: "risk", label: "Risk", icon: Shield },
          { id: "performance", label: "Yield", icon: TrendingUp },
        ].map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all duration-200"
              style={{ color: isActive ? C.lime : "#9fadaa" }}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
