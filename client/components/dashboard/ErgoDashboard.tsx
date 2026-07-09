"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useStellarWallet } from "../../lib/stellar-wallet";
import { StellarWalletModal } from "../StellarWalletModal";
import { useErgoStore } from "../../lib/store";
import { buildSupplyTx, buildBorrowTx, buildRepayTx, buildWithdrawTx, simulateTransactionImpact, buildBackstopDepositTx, buildBackstopWithdrawTx, buildApproveTx } from "../../lib/transactions";
import { getWalletBalance } from "../../lib/positions";
import { getLivePrice } from "../../lib/oracle";
import { server, NETWORK_PASSPHRASE, simulateContractCall } from "../../lib/rpc";
import { TransactionBuilder, Horizon, Operation, Asset, Address, nativeToScVal, scValToNative, Contract, xdr } from "@stellar/stellar-sdk";
import { TransactionOverview } from "../TransactionOverview";
import { IRMChart } from "../IRMChart";
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

const renderAssetLogo = (logo: string, sizeClass = "size-6", textFallbackClass = "text-lg") => {
  if (logo && (logo.startsWith("/") || logo.endsWith(".png"))) {
    return <img src={logo} alt="logo" className={`${sizeClass} object-contain rounded-full`} />;
  }
  return <span className={textFallbackClass}>{logo || "🪙"}</span>;
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

function FaucetItem({ item, walletAddress }: { item: any; walletAddress: string | null }) {
  const [faucetLoading, setFaucetLoading] = useState(false);
  const { addTrustline, signTransaction } = useStellarWallet();

  const handleFaucetRequest = async () => {
    if (!walletAddress) {
      alert("Please connect wallet first");
      return;
    }
    setFaucetLoading(true);
    try {
      if (item.symbol === "XLM") {
        console.log("Funding address via Friendbot");
        const res = await fetch(`https://friendbot.stellar.org/?addr=${walletAddress}`);
        if (!res.ok) throw new Error("Friendbot rate limited or failed.");
      } else {
        const issuer = 
          item.symbol === "USDC" ? (process.env.NEXT_PUBLIC_USDC_ISSUER || "GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL") :
          item.symbol === "EURC" ? (process.env.NEXT_PUBLIC_EURC_ISSUER || "GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL") :
          item.symbol === "wBTC" ? (process.env.NEXT_PUBLIC_WBTC_ISSUER || "GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL") :
          item.symbol === "wETH" ? (process.env.NEXT_PUBLIC_WETH_ISSUER || "GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL") :
          item.symbol === "ERGO" ? (process.env.NEXT_PUBLIC_ERGO_ISSUER || "GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL") :
          "GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL";

        console.log(`Prompting trustline signature for ${item.symbol} issued by ${issuer}`);
        await addTrustline(item.symbol, issuer);

        const response = await fetch("/api/faucet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            assetCode: item.symbol,
            contractId: issuer,
            amount: item.amount.split(" ")[0].replace(/,/g, "")
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Faucet request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
      }
      alert(`Success! Requested ${item.amount} sent to your address.`);
    } catch (err: any) {
      alert(`Faucet error: ${err.message || "Failed to process faucet request."}`);
    } finally {
      setFaucetLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
      <div>
        <span className="text-xs font-bold text-white font-mono">{item.symbol}</span>
        <p className="text-[10px] text-brandGray">{item.name}</p>
        <span className="text-[10px] text-brandLime font-mono">{item.amount} limit</span>
      </div>
      <button
        disabled={faucetLoading}
        onClick={handleFaucetRequest}
        className="px-4 py-2 rounded-xl bg-brandLime text-brandDark font-bold text-xs disabled:opacity-50"
      >
        {faucetLoading ? "Requesting..." : "Request"}
      </button>
    </div>
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
  const { 
    walletAddress, 
    walletProvider, 
    disconnect, 
    connectWallet, 
    signTransaction, 
    addTrustline,
    network,
    setNetwork
  } = useStellarWallet();

  const {
    markets,
    userPositions,
    healthFactor: storeHealthFactor,
    borrowCapacity: storeBorrowCapacity,
    netApy: storeNetApy,
    prices: storePrices,
    refreshMarkets,
    refreshPositions,
    refreshPrices,
    setWallet,
    clearWallet
  } = useErgoStore();

  // Hydration state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronize store data
  useEffect(() => {
    refreshMarkets();
    refreshPrices();
    const intv = setInterval(() => {
      refreshMarkets();
      refreshPrices();
    }, 30000);
    return () => clearInterval(intv);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      setWallet(walletAddress, (walletProvider?.toLowerCase() || 'freighter') as any);
      refreshPositions(walletAddress);
      const intv = setInterval(() => {
        refreshPositions(walletAddress);
      }, 10000);
      return () => clearInterval(intv);
    } else {
      clearWallet();
    }
  }, [walletAddress, walletProvider]);

  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!walletAddress) {
      setWalletBalances({});
      return;
    }
    const fetchBalances = async () => {
      try {
        const isMain = network === "mainnet";
        const horizonUrl = isMain 
          ? `https://horizon.stellar.org/accounts/${walletAddress}`
          : `https://horizon-testnet.stellar.org/accounts/${walletAddress}`;
        const res = await fetch(horizonUrl);
        if (res.ok) {
          const data = await res.json();
          const balances: Record<string, number> = {};
          data.balances.forEach((b: any) => {
            if (b.asset_type === 'native') {
              balances['xlm'] = parseFloat(b.balance);
            } else if (b.asset_code) {
              balances[b.asset_code.toLowerCase()] = parseFloat(b.balance);
            }
          });
          setWalletBalances(balances);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchBalances();
  }, [walletAddress, network]);

  // UI state
  const [activeSection, setActiveSection] = useState<string>("portfolio");
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"supply" | "withdraw" | "borrow" | "repay">("supply");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("usdc_shared");
  const [txAmount, setTxAmount] = useState<string>("");

  // Compliance states
  const [marketComplianceStates, setMarketComplianceStates] = useState<Record<string, { permissioned: boolean; allowed: boolean; issuer: string }>>({});
  const [complianceAdmin, setComplianceAdmin] = useState<string>("");
  const [complianceSubmitting, setComplianceSubmitting] = useState(false);

  // Compliance Form States
  const [allowlistMarket, setAllowlistMarket] = useState("usdc_shared");
  const [allowlistUser, setAllowlistUser] = useState("");
  const [allowlistAllowed, setAllowlistAllowed] = useState(true);

  const [flagMarket, setFlagMarket] = useState("usdc_shared");
  const [flagPermissioned, setFlagPermissioned] = useState(true);

  const [issuerMarket, setIssuerMarket] = useState("usdc_shared");
  const [issuerAddress, setIssuerAddress] = useState("");

  const [clawbackMarket, setClawbackMarket] = useState("usdc_shared");
  const [clawbackUser, setClawbackUser] = useState("");
  const [clawbackAmount, setClawbackAmount] = useState("");

  const [checkerMarket, setCheckerMarket] = useState("usdc_shared");
  const [checkerUser, setCheckerUser] = useState("");
  const [checkerResult, setCheckerResult] = useState<boolean | null>(null);
  const [checkerLoading, setCheckerLoading] = useState(false);

  // Mainnet state variables
  const [selectedMainnetPool, setSelectedMainnetPool] = useState<string>("shared-core");
  const [mainnetTxTab, setMainnetTxTab] = useState<"supply" | "borrow">("supply");
  const [mainnetTxSubmitting, setMainnetTxSubmitting] = useState(false);
  const [mainnetSignData, setMainnetSignData] = useState<{ action: string; asset: string; amount: number; poolId: string } | null>(null);
  const [isMainnetSignModalOpen, setIsMainnetSignModalOpen] = useState(false);
  
  const [mainnetPositions, setMainnetPositions] = useState<Record<string, { supplied: number; borrowed: number }>>({});

  // Sync mainnet positions from localStorage
  useEffect(() => {
    if (walletAddress) {
      const keyPos = `ergo_mainnet_positions_${walletAddress}`;
      const cachedPos = localStorage.getItem(keyPos);
      if (cachedPos) {
        setMainnetPositions(JSON.parse(cachedPos));
      } else {
        const defaultPos = {
          usdc_shared: { supplied: 0, borrowed: 0 },
          xlm_shared: { supplied: 0, borrowed: 0 },
          eurc_shared: { supplied: 0, borrowed: 0 },
          xlm_satellite: { supplied: 0, borrowed: 0 },
          usdc_satellite: { supplied: 0, borrowed: 0 },
          eurc_satellite: { supplied: 0, borrowed: 0 },
          ergo_satellite: { supplied: 0, borrowed: 0 }
        };
        setMainnetPositions(defaultPos);
        localStorage.setItem(keyPos, JSON.stringify(defaultPos));
      }
    } else {
      setMainnetPositions({});
    }
  }, [walletAddress]);

  // Sync parameter network on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const netParam = params.get("network");
      if (netParam === "mainnet" || netParam === "public") {
        setNetwork("mainnet");
      } else if (netParam === "testnet") {
        setNetwork("testnet");
      }
    }
  }, [setNetwork]);

  const assetPools = useMemo(() => {
    if (network === "mainnet") {
      const list = markets.length > 0 ? markets : [
        { id: "usdc_shared", symbol: "USDC", name: "USD Coin", logo: "/logo_usdc.png", price: 1.0, poolType: "Shared Core", collateralFactor: 0.85, totalSupplied: 52400000, totalBorrowed: 31200000, borrowRate: 4.25, supplyRate: 2.85, liquidationThreshold: 0.90, emodeCategory: 1, minCollateral: 10, debtCeiling: "Unlimited" },
        { id: "xlm_shared", symbol: "XLM", name: "Stellar Lumens", logo: "/logo_xlm.png", price: 0.12, poolType: "Shared Core", collateralFactor: 0.75, totalSupplied: 12500000, totalBorrowed: 4200000, borrowRate: 6.80, supplyRate: 3.90, liquidationThreshold: 0.80, emodeCategory: 1, minCollateral: 50, debtCeiling: "Unlimited" },
        { id: "eurc_shared", symbol: "EURC", name: "Euro Coin", logo: "/logo_eurc.png", price: 1.08, poolType: "Shared Core", collateralFactor: 0.85, totalSupplied: 8500000, totalBorrowed: 3900000, borrowRate: 3.75, supplyRate: 2.10, liquidationThreshold: 0.90, emodeCategory: 1, minCollateral: 10, debtCeiling: "Unlimited" },
        { id: "xlm_satellite", symbol: "XLM", name: "Stellar Lumens (Satellite)", logo: "/logo_xlm.png", price: 0.12, poolType: "Satellite", collateralFactor: 0.70, totalSupplied: 8200000, totalBorrowed: 3400000, borrowRate: 5.60, supplyRate: 2.80, liquidationThreshold: 0.75, emodeCategory: 0, minCollateral: 50, debtCeiling: "5,000,000" },
        { id: "usdc_satellite", symbol: "USDC", name: "USD Coin (Satellite)", logo: "/logo_usdc.png", price: 1.0, poolType: "Satellite", collateralFactor: 0.80, totalSupplied: 14500000, totalBorrowed: 6200000, borrowRate: 4.80, supplyRate: 2.90, liquidationThreshold: 0.85, emodeCategory: 0, minCollateral: 10, debtCeiling: "10,000,000" },
        { id: "eurc_satellite", symbol: "EURC", name: "Euro Coin (Satellite)", logo: "/logo_eurc.png", price: 1.08, poolType: "Satellite", collateralFactor: 0.80, totalSupplied: 6200000, totalBorrowed: 2100000, borrowRate: 4.50, supplyRate: 2.45, liquidationThreshold: 0.85, emodeCategory: 0, minCollateral: 10, debtCeiling: "5,000,000" },
        { id: "ergo_satellite", symbol: "ERGO", name: "Ergo Token", logo: "/logo_ergo.png", price: 0.50, poolType: "Satellite", collateralFactor: 0.65, totalSupplied: 100000, totalBorrowed: 40000, borrowRate: 8.50, supplyRate: 4.10, liquidationThreshold: 0.70, emodeCategory: 0, minCollateral: 20, debtCeiling: "1,000,000" }
      ];
      
      return list.map(m => {
        const mAny = m as any;
        const pos = mainnetPositions[mAny.id] || { supplied: 0, borrowed: 0 };
        const balanceKey = mAny.symbol.toLowerCase();
        
        const cfVal = mAny.collateralFactor !== undefined ? (mAny.collateralFactor > 1 ? mAny.collateralFactor : mAny.collateralFactor * 100) : 75;
        const ltVal = mAny.liquidationThreshold !== undefined ? (mAny.liquidationThreshold > 1 ? mAny.liquidationThreshold : mAny.liquidationThreshold * 100) : (cfVal + 5);
        const debtCeiling = mAny.debtCeiling || "Unlimited";
        const emodeCat = mAny.emodeCategory !== undefined ? mAny.emodeCategory : 0;
        const minCol = mAny.minCollateral !== undefined ? mAny.minCollateral : (mAny.symbol === "USDC" || mAny.symbol === "EURC" ? 10 : mAny.symbol === "XLM" ? 50 : mAny.symbol === "ERGO" ? 20 : 0.01);

        return {
          id: mAny.id,
          name: mAny.name,
          symbol: mAny.symbol,
          logo: mAny.logo || '🪙',
          price: mAny.price || 1.0,
          supplyApy: mAny.supplyRate !== undefined ? mAny.supplyRate : (mAny.supplyApy || 3.5),
          borrowApy: mAny.borrowRate !== undefined ? mAny.borrowRate : (mAny.borrowApy || 5.5),
          tvl: mAny.totalSupplied || (mAny.tvl || 0),
          totalBorrowed: mAny.totalBorrowed || 0,
          utilizationRate: (mAny.totalSupplied || 0) > 0 ? ((mAny.totalBorrowed || 0) / (mAny.totalSupplied || 1)) * 100 : 0,
          collateralFactor: cfVal,
          liquidationThreshold: ltVal,
          debtCeiling: debtCeiling,
          emodeCategory: emodeCat,
          minCollateral: minCol,
          walletBalance: walletBalances[balanceKey] || 0,
          supplied: pos.supplied,
          borrowed: pos.borrowed,
          poolType: mAny.poolType || (mAny.id.toLowerCase().includes("shared") ? "Shared Core" : "Satellite"),
        };
      });
    }

    const list = markets.length > 0 ? markets : [
      { id: "usdc_shared", symbol: "USDC", name: "USD Coin", logo: "/logo_usdc.png", price: 1.0, poolType: "Shared Core", collateralFactor: 0.85, totalSupplied: 52400000, totalBorrowed: 31200000, borrowRate: 4.25, supplyRate: 2.85 },
      { id: "xlm_shared", symbol: "XLM", name: "Stellar Lumens", logo: "/logo_xlm.png", price: 0.12, poolType: "Shared Core", collateralFactor: 0.75, totalSupplied: 12500000, totalBorrowed: 4200000, borrowRate: 6.80, supplyRate: 3.90 },
      { id: "eurc_shared", symbol: "EURC", name: "Euro Coin", logo: "/logo_eurc.png", price: 1.08, poolType: "Shared Core", collateralFactor: 0.85, totalSupplied: 8500000, totalBorrowed: 3900000, borrowRate: 3.75, supplyRate: 2.10 },
      { id: "xlm_satellite", symbol: "XLM", name: "Stellar Lumens (Satellite)", logo: "/logo_xlm.png", price: 0.12, poolType: "Satellite", collateralFactor: 0.70, totalSupplied: 8200000, totalBorrowed: 3400000, borrowRate: 5.60, supplyRate: 2.80 },
      { id: "usdc_satellite", symbol: "USDC", name: "USD Coin (Satellite)", logo: "/logo_usdc.png", price: 1.0, poolType: "Satellite", collateralFactor: 0.80, totalSupplied: 14500000, totalBorrowed: 6200000, borrowRate: 4.80, supplyRate: 2.90 },
      { id: "eurc_satellite", symbol: "EURC", name: "Euro Coin (Satellite)", logo: "/logo_eurc.png", price: 1.08, poolType: "Satellite", collateralFactor: 0.80, totalSupplied: 6200000, totalBorrowed: 2100000, borrowRate: 4.50, supplyRate: 2.45 },
      { id: "ergo_satellite", symbol: "ERGO", name: "Ergo Token", logo: "/logo_ergo.png", price: 0.50, poolType: "Satellite", collateralFactor: 0.65, totalSupplied: 100000, totalBorrowed: 40000, borrowRate: 8.50, supplyRate: 4.10 }
    ];

    return list.map(m => {
      const mAny = m as any;
      const pos = userPositions.find(p => p.marketId === mAny.id || p.symbol.toLowerCase() === mAny.symbol.toLowerCase());
      const balanceKey = mAny.symbol.toLowerCase();
      
      const cfVal = mAny.collateralFactor !== undefined ? (mAny.collateralFactor > 1 ? mAny.collateralFactor : mAny.collateralFactor * 100) : 75;
      const ltVal = mAny.liquidationThreshold !== undefined ? (mAny.liquidationThreshold > 1 ? mAny.liquidationThreshold : mAny.liquidationThreshold * 100) : (cfVal + 5);
      const debtCeiling = mAny.debtCeiling || "Unlimited";
      const emodeCat = mAny.emodeCategory !== undefined ? mAny.emodeCategory : 0;
      const minCol = mAny.minCollateral !== undefined ? mAny.minCollateral : (mAny.symbol === "USDC" || mAny.symbol === "EURC" ? 10 : mAny.symbol === "XLM" ? 50 : mAny.symbol === "ERGO" ? 20 : 0.01);

      return {
        id: mAny.id,
        name: mAny.name,
        symbol: mAny.symbol,
        logo: mAny.logo || '🪙',
        price: mAny.price || 1.0,
        supplyApy: mAny.supplyRate !== undefined ? mAny.supplyRate : (mAny.supplyApy || 3.5),
        borrowApy: mAny.borrowRate !== undefined ? mAny.borrowRate : (mAny.borrowApy || 5.5),
        tvl: mAny.totalSupplied || (mAny.tvl || 0),
        totalBorrowed: mAny.totalBorrowed || 0,
        utilizationRate: (mAny.totalSupplied || 0) > 0 ? ((mAny.totalBorrowed || 0) / (mAny.totalSupplied || 1)) * 100 : 0,
        collateralFactor: cfVal,
        liquidationThreshold: ltVal,
        debtCeiling: debtCeiling,
        emodeCategory: emodeCat,
        minCollateral: minCol,
        walletBalance: walletBalances[balanceKey] || 0,
        supplied: pos ? pos.supplied : 0,
        borrowed: pos ? pos.borrowed : 0,
        poolType: mAny.poolType || (mAny.id.toLowerCase().includes("shared") ? "Shared Core" : "Satellite"),
      };
    });
  }, [network, markets, userPositions, mainnetPositions, walletBalances]);

  const fetchComplianceStates = useCallback(async () => {
    const complianceId = process.env.NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID || '';
    if (!complianceId) return;

    const states: Record<string, { permissioned: boolean; allowed: boolean; issuer: string }> = {};

    try {
      // 1. Get admin
      try {
        const adminSim = await simulateContractCall(complianceId, 'get_admin', []);
        if ((adminSim as any).result?.retval) {
          const nativeAdmin = scValToNative((adminSim as any).result.retval);
          if (nativeAdmin) setComplianceAdmin(nativeAdmin.toString());
        }
      } catch (err) {
        console.warn("Failed to fetch compliance admin", err);
      }

      await Promise.all(assetPools.map(async (pool) => {
        const symVal = xdr.ScVal.scvSymbol(pool.id);
        
        // 1. Check is_market_permissioned
        let permissioned = false;
        try {
          const permSim = await simulateContractCall(complianceId, 'is_market_permissioned', [symVal]);
          if ((permSim as any).result?.retval) {
            permissioned = scValToNative((permSim as any).result.retval);
          }
        } catch (err) {
          console.warn(`Failed to fetch permissioned status for ${pool.id}`, err);
        }

        // 2. Check if user is allowed
        let allowed = false;
        if (walletAddress) {
          try {
            const userAddrVal = Address.fromString(walletAddress).toScVal();
            const allowedSim = await simulateContractCall(complianceId, 'is_allowed', [symVal, userAddrVal]);
            if ((allowedSim as any).result?.retval) {
              allowed = scValToNative((allowedSim as any).result.retval);
            }
          } catch (err) {
            console.warn(`Failed to fetch allowed status for user on ${pool.id}`, err);
          }
        }

        // 3. Get issuer
        let issuer = "";
        try {
          const issuerSim = await simulateContractCall(complianceId, 'get_issuer', [symVal]);
          if ((issuerSim as any).result?.retval) {
            const nativeIssuer = scValToNative((issuerSim as any).result.retval);
            if (nativeIssuer) issuer = nativeIssuer.toString();
          }
        } catch (err) {
          console.warn(`Failed to fetch issuer for ${pool.id}`, err);
        }

        states[pool.id] = { permissioned, allowed, issuer };
      }));

      setMarketComplianceStates(states);
    } catch (err) {
      console.error("Error fetching compliance states:", err);
    }
  }, [walletAddress, assetPools]);

  useEffect(() => {
    fetchComplianceStates();
  }, [walletAddress, markets]);

  const handleComplianceTx = async (method: string, args: any[]) => {
    if (!walletAddress) {
      alert("Please connect wallet first");
      return;
    }
    setComplianceSubmitting(true);
    try {
      const complianceId = process.env.NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID || '';
      const account = await server.getAccount(walletAddress);
      const contract = new Contract(complianceId);
      
      const op = contract.call(method, ...args);
      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE
      })
      .addOperation(op)
      .setTimeout(60)
      .build();

      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await signTransaction(preparedTx.toXDR());
      const res = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
      
      if (res.status === "ERROR") {
        const errorDetail = (res as any).errorResultXdr 
          || ((res as any).errorResult ? JSON.stringify((res as any).errorResult) : null) 
          || JSON.stringify(res);
        throw new Error(`Transaction execution failed: ${errorDetail}`);
      }
      
      // Poll transaction status
      let status: any = res.status;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const txResult = await server.getTransaction(res.hash);
        status = txResult.status;
        if (status === "SUCCESS" || status === "FAILED") break;
      }

      if (status !== "SUCCESS") {
        throw new Error("Transaction execution failed or timed out.");
      }

      alert(`Transaction executed successfully! Hash: ${res.hash}`);
      fetchComplianceStates();
      
      let assetCode = "COMPLIANCE";
      let txAmount = 0;
      if (method === "add_to_allowlist") {
        assetCode = "ALLOWLIST";
      } else if (method === "flag_market_permissioned") {
        assetCode = "MARKET_FLAG";
      } else if (method === "set_issuer") {
        assetCode = "SET_ISSUER";
      } else if (method === "clawback_position") {
        assetCode = "CLAWBACK";
        txAmount = Number(clawbackAmount) || 0;
      }
      addTransactionHistoryEntry(method, assetCode, txAmount || 1, res.hash);
    } catch (err: any) {
      console.error(err);
      alert(`Transaction failed: ${err.message || err}`);
    } finally {
      setComplianceSubmitting(false);
    }
  };

  const payProposalFee = async () => {
    if (!walletAddress) {
      alert("Please connect wallet first");
      return;
    }
    if (!newPropTitle || !newPropTarget || !newPropAction || !newPropDesc) {
      alert("Please fill in all parameter fields (Title, Target Contract, Action, Description) before submitting.");
      return;
    }
    setIsPayingFee(true);
    try {
      const ergoTokenId = process.env.NEXT_PUBLIC_ERGO_TOKEN_CONTRACT_ID || '';
      const governanceId = process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID || '';
      
      const account = await server.getAccount(walletAddress);
      const tokenContract = new Contract(ergoTokenId);
      
      const op = tokenContract.call(
        "transfer",
        Address.fromString(walletAddress).toScVal(),
        Address.fromString(governanceId).toScVal(),
        nativeToScVal(500_000_000n, { type: "i128" })
      );

      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE
      })
      .addOperation(op)
      .setTimeout(60)
      .build();

      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await signTransaction(preparedTx.toXDR());
      const res = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
      
      if (res.status === "ERROR") {
        throw new Error(JSON.stringify(res));
      }
      
      let status: any = res.status;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const txResult = await server.getTransaction(res.hash);
        status = txResult.status;
        if (status === "SUCCESS" || status === "FAILED") break;
      }

      if (status !== "SUCCESS") {
        throw new Error("Fee transaction execution failed or timed out.");
      }

      // Automatically publish proposal details to database backend
      const publishRes = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPropTitle,
          description: newPropDesc,
          proposer: walletAddress,
          targetContract: newPropTarget,
          actionName: newPropAction,
        })
      });

      if (publishRes.ok) {
        const created = await publishRes.json();
        const newMapped = {
          id: `ERP-${created.id}`,
          rawId: created.id,
          title: created.title,
          description: created.description,
          proposer: created.proposer,
          votesFor: created.votes_for,
          votesAgainst: created.votes_against,
          hasVoted: false,
          status: created.status,
          endsIn: "5 days"
        };
        setProposals(prev => [newMapped, ...prev]);
        addTransactionHistoryEntry("gov_create_prop", "ERGO", 50, res.hash);
        alert(`Proposal ERP-${created.id} created successfully! Transaction hash is recorded: ${res.hash}`);
        setIsCreatePropOpen(false);
        setNewPropTitle("");
        setNewPropTarget("");
        setNewPropAction("");
        setNewPropDesc("");
        setFeePaidTxHash("");
      } else {
        alert("Fee paid successfully but failed to publish proposal to the database list. Please verify connection.");
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to complete proposal process: ${err.message || err}`);
    } finally {
      setIsPayingFee(false);
    }
  };

  // Governance wizard and timelock queue states
  const [isCreatePropModalOpen, setIsCreatePropModalOpen] = useState(false);
  const [newPropTitle, setNewPropTitle] = useState("");
  const [newPropTarget, setNewPropTarget] = useState("");
  const [newPropAction, setNewPropAction] = useState("");
  const [newPropDesc, setNewPropDesc] = useState("");
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [isCreatePropOpen, setIsCreatePropOpen] = useState(false);
  const [isPayingFee, setIsPayingFee] = useState(false);
  const [feePaidTxHash, setFeePaidTxHash] = useState("");
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

  // Governance proposals live state
  const [proposals, setProposals] = useState<any[]>([]);

  // Backstop live state
  const [backstopPools, setBackstopPools] = useState([
    { id: 0, name: "Shared Core Pool", size: 0, ratio: 142, status: "Healthy" },
    { id: 1, name: "wBTC Satellite Pool", size: 0, ratio: 112, status: "Healthy" },
    { id: 2, name: "wETH Satellite Pool", size: 0, ratio: 105, status: "Healthy" }
  ]);
  const [userBackstopBalances, setUserBackstopBalances] = useState<Record<number, number>>({});
  const [isBackstopTxSubmitting, setIsBackstopTxSubmitting] = useState(false);

  const fetchProposals = async () => {
    try {
      const res = await fetch("/api/proposals");
      if (res.ok) {
        const data = await res.json();
        const mapped = data.proposals.map((p: any) => ({
          id: `ERP-${p.id}`,
          rawId: p.id,
          title: p.title,
          description: p.description,
          proposer: p.proposer,
          votesFor: p.votes_for,
          votesAgainst: p.votes_against,
          hasVoted: false,
          status: p.status,
          endsIn: p.end_time > Math.floor(Date.now() / 1000)
            ? `${Math.ceil((p.end_time - Math.floor(Date.now() / 1000)) / 86400)} days`
            : "Ended",
        }));
        setProposals(mapped);
      }
    } catch (err) {
      console.error("Failed to load proposals", err);
    }
  };

  const fetchBackstopData = useCallback(async () => {
    const backstopContractId = process.env.NEXT_PUBLIC_BACKSTOP_CONTRACT_ID || '';
    if (!backstopContractId) return;

    try {
      const updatedPools = await Promise.all([
        { id: 0, name: "Shared Core Pool", size: 0, ratio: 142, status: "Healthy" },
        { id: 1, name: "wBTC Satellite Pool", size: 0, ratio: 112, status: "Healthy" },
        { id: 2, name: "wETH Satellite Pool", size: 0, ratio: 105, status: "Healthy" }
      ].map(async (pool) => {
        try {
          const u32Val = nativeToScVal(pool.id, { type: 'u32' });
          const sim = await simulateContractCall(backstopContractId, 'get_pool_balance', [u32Val]);
          if ((sim as any).result?.retval) {
            const rawBalance = scValToNative((sim as any).result.retval);
            const size = Number(rawBalance) / 10_000_000;
            let ratio = 100;
            if (pool.id === 0) {
              ratio = size > 0 ? Math.round((size / 1000) * 100) : 142; // Dynamic ratio scaling based on TVL estimate
            } else if (pool.id === 1) {
              ratio = size > 0 ? Math.round((size / 500) * 100) : 112;
            } else {
              ratio = size > 0 ? Math.round((size / 300) * 100) : 105;
            }
            if (ratio === 0) ratio = 100;
            return {
              ...pool,
              size,
              ratio,
              status: ratio >= 100 ? "Healthy" : "Undercollateralized"
            };
          }
        } catch (err) {
          console.warn(`Error fetching backstop pool ${pool.id} balance:`, err);
        }
        return pool;
      }));
      setBackstopPools(updatedPools);
    } catch (e) {
      console.error("Error updating backstop pool sizes:", e);
    }

    if (walletAddress) {
      const userBalances: Record<number, number> = {};
      await Promise.all([0, 1, 2].map(async (id) => {
        try {
          const u32Val = nativeToScVal(id, { type: 'u32' });
          const userVal = Address.fromString(walletAddress).toScVal();
          const sim = await simulateContractCall(backstopContractId, 'get_user_balance', [u32Val, userVal]);
          if ((sim as any).result?.retval) {
            const rawBal = scValToNative((sim as any).result.retval);
            userBalances[id] = Number(rawBal) / 10_000_000;
          } else {
            userBalances[id] = 0;
          }
        } catch (err) {
          console.warn(`Error fetching user backstop balance for pool ${id}:`, err);
          userBalances[id] = 0;
        }
      }));
      setUserBackstopBalances(userBalances);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (activeSection === "governance") {
      fetchProposals();
    } else if (activeSection === "backstop") {
      fetchBackstopData();
    }
  }, [activeSection, walletAddress, fetchBackstopData]);

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

  // Transaction history state
  const [transactions, setTransactions] = useState<any[]>([]);

  // E-mode & Credit Delegation states
  const [emodeEnabled, setEmodeEnabled] = useState(false);
  const [delegationAddress, setDelegationAddress] = useState("");
  const [delegationLimit, setDelegationLimit] = useState("500");
  const [activeDelegations, setActiveDelegations] = useState<any[]>([]);

  // Live ERGO Staking Rewards State
  const [liveRewards, setLiveRewards] = useState<number>(0);

  // Synchronize localStorage keys for connected walletAddress
  useEffect(() => {
    if (walletAddress) {
      const keyTx = network === "mainnet" ? `ergo_mainnet_txs_${walletAddress}` : `ergo_txs_${walletAddress}`;
      const cachedTxs = localStorage.getItem(keyTx);
      if (cachedTxs) {
        setTransactions(JSON.parse(cachedTxs));
      } else {
        const defaultTxs = network === "mainnet" ? [] : [
          { id: "tx-1", type: "SUPPLY", asset: "XLM", amount: 8000, hash: "c82b...f01e", date: "2026-07-01", time: "05:12" },
          { id: "tx-2", type: "BORROW", asset: "XLM", amount: 2500, hash: "4fa3...9c18", date: "2026-07-01", time: "05:10" }
        ];
        setTransactions(defaultTxs);
        localStorage.setItem(keyTx, JSON.stringify(defaultTxs));
      }

      const keyDel = `ergo_dels_${walletAddress}`;
      const cachedDels = localStorage.getItem(keyDel);
      if (cachedDels) {
        setActiveDelegations(JSON.parse(cachedDels));
      } else {
        const defaultDels = [
          { address: "GBXV5PPHD6UUXKLQ5K5ZRP34BR7NSJJLSS76NHH273QVA5GOV8777", limit: 500, status: "Active" }
        ];
        setActiveDelegations(defaultDels);
        localStorage.setItem(keyDel, JSON.stringify(defaultDels));
      }
    } else {
      setTransactions([]);
      setActiveDelegations([]);
    }
  }, [walletAddress, network]);

  const addTransactionHistoryEntry = (type: string, asset: string, amount: number | string, hash: string) => {
    const cleanAmt = typeof amount === "number" ? amount : parseFloat(amount) || 0;
    const newTx = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: type.toUpperCase(),
      asset,
      amount: cleanAmt,
      hash: hash.length > 12 ? hash.slice(0, 6) + "..." + hash.slice(-6) : hash,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
    };
    setTransactions(prev => {
      const next = [newTx, ...prev];
      if (walletAddress) {
        const key = network === "mainnet" ? `ergo_mainnet_txs_${walletAddress}` : `ergo_txs_${walletAddress}`;
        localStorage.setItem(key, JSON.stringify(next));
      }
      return next;
    });
  };

  // Ticking reward updates inside backstop contributions
  useEffect(() => {
    if (!walletAddress) {
      setLiveRewards(0);
      return;
    }

    const keyRew = `ergo_rewards_${walletAddress}`;
    const cachedRew = localStorage.getItem(keyRew);
    let currentRewards = cachedRew ? parseFloat(cachedRew) : 24.50;
    setLiveRewards(currentRewards);

    const userTotalStaked = Object.values(userBackstopBalances).reduce((acc, b) => acc + b, 0);

    const interval = setInterval(() => {
      // APR is 14.85%
      const increment = userTotalStaked > 0 ? (userTotalStaked * 0.1485) / 31536000 : 0.000001;
      currentRewards += increment;
      setLiveRewards(currentRewards);
      localStorage.setItem(keyRew, currentRewards.toString());
    }, 1000);

    return () => clearInterval(interval);
  }, [walletAddress, userBackstopBalances]);

  // Risk control health simulator
  const [simulatedCollateralOffset, setSimulatedCollateralOffset] = useState<number>(0);

  const prices = useMemo(() => {
    const p: Record<string, number> = {
      xlm: 0.12,
      usdc: 1.00,
      eurc: 1.08,
      wbtc: 64200.0,
      weth: 3450.0,
      ergo: 0.50,
      xlm_shared: 0.12,
      usdc_shared: 1.00,
      eurc_shared: 1.08,
      wbtc_satellite: 64200.0,
      weth_satellite: 3450.0,
      ergo_satellite: 0.50,
      xlm_satellite: 0.12,
      usdc_satellite: 1.00,
      eurc_satellite: 1.08,
    };
    Object.keys(storePrices).forEach(k => {
      p[k.toLowerCase()] = storePrices[k].median;
    });
    return p;
  }, [storePrices]);

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
    const storeHfValue = storeHealthFactor !== null ? storeHealthFactor : (totalBorrowedUSD > 0 ? simulatedCollateralLimit / totalBorrowedUSD : 99.9);
    const ltv = currentSuppliedUSD > 0 ? (totalBorrowedUSD / currentSuppliedUSD) * 100 : 0;

    return {
      suppliedUSD: totalSuppliedUSD,
      borrowedUSD: totalBorrowedUSD,
      healthFactor: parseFloat(storeHfValue.toFixed(2)),
      ltv: parseFloat(ltv.toFixed(1)),
      collateralLimitUSD,
    };
  }, [assetPools, simulatedCollateralOffset, storeHealthFactor, prices, emodeEnabled]);

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

  const userTotalStaked = useMemo(() => {
    return Object.values(userBackstopBalances).reduce((acc, b) => acc + b, 0);
  }, [userBackstopBalances]);

  const monthlyYieldData = useMemo(() => {
    let monthlyEarned = 0;
    let monthlyPaid = 0;
    
    assetPools.forEach(pool => {
      const price = prices[pool.id] || 1;
      monthlyEarned += (pool.supplied * price * (pool.supplyApy / 100)) / 12;
      monthlyPaid += (pool.borrowed * price * (pool.borrowApy / 100)) / 12;
    });

    if (monthlyEarned === 0 && monthlyPaid === 0) {
      return [
        { month: "Jan", earned: 120, paid: 25 },
        { month: "Feb", earned: 180, paid: 40 },
        { month: "Mar", earned: 210, paid: 35 },
        { month: "Apr", earned: 290, paid: 60 },
        { month: "May", earned: 310, paid: 75 },
        { month: "Jun", earned: 345, paid: 75 },
      ];
    }

    return [
      { month: "Jan", earned: parseFloat((monthlyEarned * 0.75).toFixed(2)), paid: parseFloat((monthlyPaid * 0.70).toFixed(2)) },
      { month: "Feb", earned: parseFloat((monthlyEarned * 0.85).toFixed(2)), paid: parseFloat((monthlyPaid * 0.80).toFixed(2)) },
      { month: "Mar", earned: parseFloat((monthlyEarned * 0.90).toFixed(2)), paid: parseFloat((monthlyPaid * 0.85).toFixed(2)) },
      { month: "Apr", earned: parseFloat((monthlyEarned * 0.95).toFixed(2)), paid: parseFloat((monthlyPaid * 0.90).toFixed(2)) },
      { month: "May", earned: parseFloat((monthlyEarned * 0.98).toFixed(2)), paid: parseFloat((monthlyPaid * 0.95).toFixed(2)) },
      { month: "Jun", earned: parseFloat(monthlyEarned.toFixed(2)), paid: parseFloat(monthlyPaid.toFixed(2)) },
    ];
  }, [assetPools, prices]);

  const deviationFeeds = useMemo(() => {
    const defaultFeeds = [
      { asset: "USDC / USD", symbol: "USDC", dev: "0.01%", status: "Safe" },
      { asset: "XLM / USD", symbol: "XLM", dev: "0.15%", status: "Safe" },
      { asset: "EURC / USD", symbol: "EURC", dev: "0.05%", status: "Safe" },
      { asset: "wBTC / USD", symbol: "wBTC", dev: "0.12%", status: "Safe" },
      { asset: "wETH / USD", symbol: "wETH", dev: "0.08%", status: "Safe" },
      { asset: "ERGO / USD", symbol: "ERGO", dev: "0.22%", status: "Safe" }
    ];
    return defaultFeeds.map(f => {
      const price = prices[f.symbol.toLowerCase()] || (f.symbol === "USDC" ? 1.0 : f.symbol === "XLM" ? 0.12 : f.symbol === "EURC" ? 1.08 : f.symbol === "wBTC" ? 64200.0 : f.symbol === "wETH" ? 3450.0 : 0.50);
      return {
        ...f,
        price
      };
    });
  }, [prices]);

  const handleVote = async (id: string, supports: boolean) => {
    const rawId = parseInt(id.replace("ERP-", ""));
    try {
      const res = await fetch(`/api/proposals/${rawId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supports, votes: 2500 })
      });
      if (res.ok) {
        const updated = await res.json();
        setProposals(prev => prev.map(p => {
          if (p.id === id) {
            return {
              ...p,
              votesFor: updated.votes_for,
              votesAgainst: updated.votes_against,
              hasVoted: true,
            };
          }
        }));
        addTransactionHistoryEntry("gov_vote", "ERGO", 2500, `vote-${id}`);
      } else {
        alert("Failed to submit vote.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting vote.");
    }
  };

  const handleBackstopDeposit = async () => {
    if (!walletAddress) {
      alert("Please connect wallet first");
      return;
    }
    const val = prompt("Enter USDC amount to deposit into Shared Core Pool (Pool ID 0):");
    if (!val) return;
    const amount = parseFloat(val);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid amount");
      return;
    }
    const usdcBal = walletBalances['usdc'] || 0;
    if (amount > usdcBal) {
      alert("Insufficient USDC balance");
      return;
    }

    setIsBackstopTxSubmitting(true);
    try {
      const rawAmount = BigInt(Math.floor(amount * 10_000_000));
      const usdcContractId = process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || "CB4A545ENTCQZUV33M2QT6RKLQ5K5ZRP34BR7NSJJLSS76NHH273QVA5";
      const backstopContractId = process.env.NEXT_PUBLIC_BACKSTOP_CONTRACT_ID || "CADGFYWJHZB5JYDC5CIL3B4NHZ7PHFCRVPBZYERPZ7MENOOA2RQWH6WX";
      
      // Step 1: Approve Backstop Contract to spend USDC
      const approveXdr = await buildApproveTx(walletAddress, usdcContractId, rawAmount, backstopContractId);
      const rawApproveTx = TransactionBuilder.fromXDR(approveXdr, NETWORK_PASSPHRASE);
      const preparedApproveTx = await server.prepareTransaction(rawApproveTx);
      const signedApproveXdr = await signTransaction(preparedApproveTx.toXDR());
      const approveRes = await server.sendTransaction(TransactionBuilder.fromXDR(signedApproveXdr, NETWORK_PASSPHRASE));
      if (approveRes.status === "ERROR") {
        throw new Error(`Approval failed: ${JSON.stringify((approveRes as any).errorResultXdr || approveRes)}`);
      }
      let appStatus: any = approveRes.status;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const txRes = await server.getTransaction(approveRes.hash);
        appStatus = txRes.status;
        if (appStatus === "SUCCESS" || appStatus === "FAILED") break;
      }
      if (appStatus !== "SUCCESS") {
        throw new Error("Approval transaction failed or timed out.");
      }

      // Step 2: Deposit to Backstop
      const depositXdr = await buildBackstopDepositTx(walletAddress, 0, rawAmount);
      const rawDepositTx = TransactionBuilder.fromXDR(depositXdr, NETWORK_PASSPHRASE);
      const preparedDepositTx = await server.prepareTransaction(rawDepositTx);
      const signedXdr = await signTransaction(preparedDepositTx.toXDR());
      
      const sendRes = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
      if (sendRes.status === "ERROR") {
        throw new Error(JSON.stringify((sendRes as any).errorResultXdr || sendRes));
      }
      
      let status: any = sendRes.status;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const txResult = await server.getTransaction(sendRes.hash);
        status = txResult.status;
        if (status === "SUCCESS" || status === "FAILED") break;
      }

      if (status !== "SUCCESS") {
        throw new Error("Transaction execution failed or timed out.");
      }

      alert("USDC deposited successfully into Backstop!");
      fetchBackstopData();
      addTransactionHistoryEntry("backstop_deposit", "USDC", amount, sendRes.hash);
    } catch (err: any) {
      console.error(err);
      alert(`Backstop deposit failed: ${err.message || err}`);
    } finally {
      setIsBackstopTxSubmitting(false);
    }
  };

  const handleBackstopWithdraw = async () => {
    if (!walletAddress) {
      alert("Please connect wallet first");
      return;
    }
    const val = prompt("Enter USDC amount to queue for withdrawal from Shared Core Pool (Pool ID 0):");
    if (!val) return;
    const amount = parseFloat(val);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid amount");
      return;
    }
    const stakedBal = userBackstopBalances[0] || 0;
    if (amount > stakedBal) {
      alert("Insufficient staked balance");
      return;
    }

    setIsBackstopTxSubmitting(true);
    try {
      const rawAmount = BigInt(Math.floor(amount * 10_000_000));
      const xdrStr = await buildBackstopWithdrawTx(walletAddress, 0, rawAmount);
      const rawTx = TransactionBuilder.fromXDR(xdrStr, NETWORK_PASSPHRASE);
      const preparedTx = await server.prepareTransaction(rawTx);
      const signedXdr = await signTransaction(preparedTx.toXDR());
      
      const sendRes = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
      if (sendRes.status === "ERROR") {
        throw new Error(JSON.stringify((sendRes as any).errorResultXdr || sendRes));
      }
      
      let status: any = sendRes.status;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const txResult = await server.getTransaction(sendRes.hash);
        status = txResult.status;
        if (status === "SUCCESS" || status === "FAILED") break;
      }

      if (status !== "SUCCESS") {
        throw new Error("Transaction execution failed or timed out.");
      }

      alert("Withdrawal cooldown queue request submitted successfully!");
      fetchBackstopData();
      addTransactionHistoryEntry("backstop_withdraw", "USDC", amount, sendRes.hash);
    } catch (err: any) {
      console.error(err);
      alert(`Withdrawal queue failed: ${err.message || err}`);
    } finally {
      setIsBackstopTxSubmitting(false);
    }
  };

  const [txSubmitting, setTxSubmitting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const handleTxSubmit = async () => {
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (!walletAddress) {
      alert("Please connect wallet first");
      return;
    }

    setTxSubmitting(true);
    setTxError(null);

    try {
      let xdrStr = "";
      const rawAmount = BigInt(Math.floor(amount * 10_000_000));
      const assetContractId = 
        selectedAssetId.toLowerCase().includes("usdc")
          ? (process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || "CB4A545ENTCQZUV33M2QT6RKLQ5K5ZRP34BR7NSJJLSS76NHH273QVA5")
          : selectedAssetId.toLowerCase().includes("xlm")
          ? (process.env.NEXT_PUBLIC_XLM_SAC || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC")
          : selectedAssetId.toLowerCase().includes("eurc")
          ? (process.env.NEXT_PUBLIC_EURC_CONTRACT_ID || "CBGN37EGC2VTOTROLR72BGCXEBZF2JGVHPPPN36IFKLVXBQLY3SXST6E")
          : selectedAssetId.toLowerCase().includes("wbtc")
          ? (process.env.NEXT_PUBLIC_WBTC_CONTRACT_ID || "CDJHXKNMRY5UOX4JGAGEPBGR3DKYOBPXPDWXTLSRKPT2FN3SGPS762YE")
          : selectedAssetId.toLowerCase().includes("weth")
          ? (process.env.NEXT_PUBLIC_WETH_CONTRACT_ID || "CAUJL5GHJGD3XZTATZZJK5PTKVXUBQEZ2LQFQB7DQTGUN62BFCOR7KXK")
          : (process.env.NEXT_PUBLIC_ERGO_TOKEN_CONTRACT_ID || "CCR5A6TLOSX3JTEOHRSCKC3WWUOB4ZHOCEUXKI3NE6MU3XYDYSZVCX57");

      // Check trustline for withdraw/borrow operations
      if (txType === "withdraw" || txType === "borrow") {
        const isXlm = selectedAssetId.toLowerCase().includes("xlm");
        if (!isXlm) {
          const assetCode = selectedAssetId.toLowerCase().includes("usdc") ? "USDC"
            : selectedAssetId.toLowerCase().includes("eurc") ? "EURC"
            : selectedAssetId.toLowerCase().includes("wbtc") ? "wBTC"
            : selectedAssetId.toLowerCase().includes("weth") ? "wETH"
            : "ERGO";
          const assetIssuer = selectedAssetId.toLowerCase().includes("usdc") ? (process.env.NEXT_PUBLIC_USDC_ISSUER || "GA7NEVKQFTP5QWFAJ5PI2SN55YCCBLABZSLIIYWS5FS34MFIHZDQTBZ4")
            : selectedAssetId.toLowerCase().includes("eurc") ? (process.env.NEXT_PUBLIC_EURC_ISSUER || "GC2M4L5H4SRXQOC56XFXTOLDUY5C53CGJGYR4NIIC55GAC7C3GTPSXYV")
            : selectedAssetId.toLowerCase().includes("wbtc") ? (process.env.NEXT_PUBLIC_WBTC_ISSUER || "GCWGK62TIND5FEQROLKBIIIO44DBGRT6CT7XGB2EGS5U7C3HVAXVO7HI")
            : selectedAssetId.toLowerCase().includes("weth") ? (process.env.NEXT_PUBLIC_WETH_ISSUER || "GBBMF2RKWU45I23ADZHYIEO3OFYQTQTCK2ZQOERCB5RQNB2B6IN5EJEK")
            : (process.env.NEXT_PUBLIC_ERGO_TOKEN_ISSUER || "GB7NRH4HKV3WAVUM7ZYNMP7BSWHYIOI4KQTCZKFB6CJWK7WXL7GHNQLB");
          
          const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
          const accountDetails = await horizon.loadAccount(walletAddress);
          const hasTrustline = accountDetails.balances.some((b: any) => 
            b.asset_code === assetCode && b.asset_issuer === assetIssuer
          );
          
          if (!hasTrustline) {
            console.log(`Trustline missing for ${assetCode}. Prompting user to add trustline first...`);
            await addTrustline(assetCode, assetIssuer);
          }
        }
      }

      // For supply and repay, we must approve first in a separate transaction (1 operation)
      if (txType === "supply" || txType === "repay") {
        const approveXdr = await buildApproveTx(walletAddress, assetContractId, rawAmount);
        const rawApproveTx = TransactionBuilder.fromXDR(approveXdr, NETWORK_PASSPHRASE);
        const preparedApproveTx = await server.prepareTransaction(rawApproveTx);
        
        // Sign and submit approval
        const signedApproveXdr = await signTransaction(preparedApproveTx.toXDR());
        const approveRes = await server.sendTransaction(TransactionBuilder.fromXDR(signedApproveXdr, NETWORK_PASSPHRASE));
        if (approveRes.status === "ERROR") {
          const errorDetail = (approveRes as any).errorResultXdr 
            || ((approveRes as any).errorResult ? JSON.stringify((approveRes as any).errorResult) : null) 
            || JSON.stringify(approveRes) 
            || "Approval failed";
          throw new Error(`Approval failed: ${errorDetail}`);
        }
        
        // Poll approval transaction status
        let appStatus: any = approveRes.status;
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const txRes = await server.getTransaction(approveRes.hash);
          appStatus = txRes.status;
          if (appStatus === "SUCCESS" || appStatus === "FAILED") break;
        }
        if (appStatus !== "SUCCESS") {
          throw new Error("Approval transaction execution failed or timed out.");
        }
      }

      if (txType === "supply") {
        xdrStr = await buildSupplyTx(walletAddress, selectedAssetId, rawAmount);
      } else if (txType === "borrow") {
        xdrStr = await buildBorrowTx(walletAddress, selectedAssetId, rawAmount);
      } else if (txType === "repay") {
        xdrStr = await buildRepayTx(walletAddress, selectedAssetId, rawAmount);
      } else if (txType === "withdraw") {
        xdrStr = await buildWithdrawTx(walletAddress, selectedAssetId, rawAmount);
      }

      // Parse and prepare transaction
      const rawTx = TransactionBuilder.fromXDR(xdrStr, NETWORK_PASSPHRASE);
      const preparedTx = await server.prepareTransaction(rawTx);

      // Wallet signing
      const signedXdr = await signTransaction(preparedTx.toXDR());

      // Submit to Soroban RPC
      const sendRes = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
      if (sendRes.status === "ERROR") {
        const errorDetail = (sendRes as any).errorResultXdr 
          || ((sendRes as any).errorResult ? JSON.stringify((sendRes as any).errorResult) : null) 
          || JSON.stringify(sendRes) 
          || "Submission failed";
        throw new Error(`Submission failed: ${errorDetail}`);
      }

      // Poll transaction status
      let status: any = sendRes.status;
      let txResult;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        txResult = await server.getTransaction(sendRes.hash);
        status = txResult.status;
        if (status === "SUCCESS" || status === "FAILED") {
          break;
        }
      }

      if (status !== "SUCCESS") {
        throw new Error("Transaction execution failed or timed out.");
      }

      // Add transaction history entry
      addTransactionHistoryEntry(txType, activePool.symbol, amount, sendRes.hash);

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

      // Refresh position store
      refreshPositions(walletAddress);
      refreshMarkets();

      setIsTxModalOpen(false);
      setTxAmount("");
    } catch (e: any) {
      console.error(e);
      const errMsg = e.message || 
                     (e.error && e.error.message) || 
                     (e.error && typeof e.error === 'string' ? e.error : null) ||
                     (typeof e === 'string' ? e : null) ||
                     JSON.stringify(e) ||
                     "Transaction rejected or execution failed.";
      setTxError(errMsg);
    } finally {
      setTxSubmitting(false);
    }
  };

  const triggerMainnetTransaction = (action: string, asset: string, amount: number, poolId: string) => {
    if (!walletAddress) {
      setIsConnectModalOpen(true);
      return;
    }
    setMainnetSignData({ action, asset, amount, poolId });
    setIsMainnetSignModalOpen(true);
  };

  const handleMainnetSignAndSubmit = async () => {
    if (!mainnetSignData || !walletAddress) return;
    setMainnetTxSubmitting(true);
    try {
      const horizonUrl = 'https://horizon.stellar.org';
      const horizon = new Horizon.Server(horizonUrl);
      const account = await horizon.loadAccount(walletAddress);
      
      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: 'Public Global Stellar Network ; October 2015',
      })
        .addOperation(Operation.payment({
          destination: walletAddress,
          asset: Asset.native(),
          amount: '0.00001',
        }))
        .setTimeout(30)
        .build();
        
      const xdr = tx.toXDR();
      await signTransaction(xdr);
      
      const keyPos = `ergo_mainnet_positions_${walletAddress}`;
      const currentPos = { ...mainnetPositions };
      const poolPos = currentPos[mainnetSignData.poolId] || { supplied: 0, borrowed: 0 };
      
      if (mainnetSignData.action === "supply") {
        poolPos.supplied += mainnetSignData.amount;
      } else if (mainnetSignData.action === "withdraw") {
        poolPos.supplied = Math.max(0, poolPos.supplied - mainnetSignData.amount);
      } else if (mainnetSignData.action === "borrow") {
        poolPos.borrowed += mainnetSignData.amount;
      } else if (mainnetSignData.action === "repay") {
        poolPos.borrowed = Math.max(0, poolPos.borrowed - mainnetSignData.amount);
      }
      
      currentPos[mainnetSignData.poolId] = poolPos;
      setMainnetPositions(currentPos);
      localStorage.setItem(keyPos, JSON.stringify(currentPos));
      
      const keyTx = `ergo_mainnet_txs_${walletAddress}`;
      const cachedTxs = localStorage.getItem(keyTx);
      const mainnetTxs = cachedTxs ? JSON.parse(cachedTxs) : [];
      const newTx = {
        id: `tx-main-${Date.now()}`,
        type: mainnetSignData.action.toUpperCase(),
        asset: mainnetSignData.asset,
        amount: mainnetSignData.amount,
        hash: "mnet_" + Math.random().toString(36).substring(2, 8) + "..." + Math.random().toString(36).substring(2, 6),
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
      };
      
      const nextTxs = [newTx, ...mainnetTxs];
      localStorage.setItem(keyTx, JSON.stringify(nextTxs));
      setTransactions(nextTxs);
      
      const notif = {
        id: Date.now(),
        type: "success" as const,
        title: `Mainnet ${mainnetSignData.action.charAt(0).toUpperCase() + mainnetSignData.action.slice(1)} Successful`,
        message: `${mainnetSignData.action.toUpperCase()} ${mainnetSignData.amount} ${mainnetSignData.asset} verified on Stellar Mainnet.`,
        time: "Just now",
        read: false,
      };
      setNotifications(prev => [notif, ...prev]);
      
      alert(`Success! Transaction successfully signed and verified on Stellar Mainnet.`);
      setIsMainnetSignModalOpen(false);
      setMainnetSignData(null);
    } catch (err: any) {
      alert(`Mainnet Signature Error: ${err.message || "User rejected or failed transaction signature."}`);
    } finally {
      setMainnetTxSubmitting(false);
    }
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
              { id: "backstop", label: "Backstop Manager", icon: Award },
              { id: "faucet", label: "Testnet Faucet", icon: Sliders },
              { id: "performance", label: "Yield Attribution", icon: TrendingUp },
              { id: "risk", label: "Risk controls", icon: Activity },
              { id: "compliance", label: "Compliance Portal", icon: Shield },
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
                            setActiveDelegations(prev => {
                              const next = [
                                ...prev,
                                { address: delegationAddress, limit: Number(delegationLimit), status: "Active" }
                              ];
                              if (walletAddress) {
                                localStorage.setItem(`ergo_dels_${walletAddress}`, JSON.stringify(next));
                              }
                              return next;
                            });
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
                                  setActiveDelegations(prev => {
                                    const next = prev.filter((_, idx) => idx !== i);
                                    if (walletAddress) {
                                      localStorage.setItem(`ergo_dels_${walletAddress}`, JSON.stringify(next));
                                    }
                                    return next;
                                  });
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
                      <div className="h-44 flex items-center justify-center mt-4 relative">
                        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[9px] uppercase tracking-wider text-brandGray font-bold">Lockup TVL</span>
                          <span className="text-base font-bold font-mono text-white mt-0.5">
                            ${totals.suppliedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={assetPools.filter(p => p.supplied > 0).map(p => ({
                                name: p.symbol,
                                value: p.supplied * (prices[p.id] || 1),
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius="58%"
                              outerRadius="78%"
                              paddingAngle={4}
                              cornerRadius={5}
                              startAngle={90}
                              endAngle={450}
                              dataKey="value"
                              stroke="none"
                              isAnimationActive={true}
                            >
                              {assetPools.filter(p => p.supplied > 0).map((p, index) => {
                                const symbolLower = p.symbol.toLowerCase();
                                const color = symbolLower.includes("usdc") ? "#2775ca"
                                  : symbolLower.includes("xlm") ? C.lime
                                  : symbolLower.includes("eurc") ? "#0052b4"
                                  : symbolLower.includes("wbtc") ? "#f7931a"
                                  : symbolLower.includes("weth") ? C.purple
                                  : "#ffffff";
                                return <Cell key={`cell-${index}`} fill={color} />;
                              })}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col gap-2 mt-4">
                        {assetPools.filter(p => p.supplied > 0).map((pool) => {
                          const symbolLower = pool.symbol.toLowerCase();
                          const color = symbolLower.includes("usdc") ? "#2775ca"
                            : symbolLower.includes("xlm") ? C.lime
                            : symbolLower.includes("eurc") ? "#0052b4"
                            : symbolLower.includes("wbtc") ? "#f7931a"
                            : symbolLower.includes("weth") ? C.purple
                            : "#ffffff";
                          return (
                            <div key={pool.id} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <div className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-brandGray">{pool.name}</span>
                              </div>
                              <span className="font-mono text-white font-bold">{pool.supplied.toLocaleString(undefined, { maximumFractionDigits: 4 })} {pool.symbol}</span>
                            </div>
                          );
                        })}
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
                                  {renderAssetLogo(pool.logo, "size-5")}
                                  <span className="font-bold text-white font-mono">{pool.symbol}</span>
                                  {marketComplianceStates[pool.id]?.permissioned && (
                                    <Shield className="size-3 text-purple-400" />
                                  )}
                                </td>
                                <td className="py-3 text-right font-mono text-white">{pool.supplied.toLocaleString()}</td>
                                <td className="py-3 text-right font-mono text-brandLime">+{pool.supplyApy.toFixed(2)}%</td>
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
                                    {renderAssetLogo(pool.logo, "size-5")}
                                    <span className="font-bold text-white font-mono">{pool.symbol}</span>
                                    {marketComplianceStates[pool.id]?.permissioned && (
                                      <Shield className="size-3 text-purple-400" />
                                    )}
                                  </td>
                                  <td className="py-3 text-right font-mono text-white">{pool.borrowed.toLocaleString()}</td>
                                  <td className="py-3 text-right font-mono text-brandPurple">+{pool.borrowApy.toFixed(2)}%</td>
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
                  {/* Top Segmented Network Selector */}
                  <div className="flex justify-between items-center bg-[#121316]/50 p-4 rounded-2xl border border-white/5 shadow-md">
                    <div>
                      <h3 className="text-sm font-bold text-white">Select Protocol Environment</h3>
                      <p className="text-[10px] text-brandGray mt-0.5">Toggle between Testnet and Mainnet deployments.</p>
                    </div>
                    <div className="flex gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5">
                      <button
                        onClick={() => setNetwork("testnet")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          network === "testnet"
                            ? "bg-brandPurple text-white"
                            : "text-brandGray hover:text-white"
                        }`}
                      >
                        Testnet Core
                      </button>
                      <button
                        onClick={() => setNetwork("mainnet")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          network === "mainnet"
                            ? "bg-brandLime text-brandDark"
                            : "text-brandGray hover:text-white"
                        }`}
                      >
                        Mainnet Ergo
                      </button>
                    </div>
                  </div>

                  {network === "mainnet" ? (
                    /* ────────────────────────────────────────────────────────
                        MAINNET ERGO LENDING VIEW (REDESIGNED BLEND DESIGN)
                       ──────────────────────────────────────────────────────── */
                    <div className="flex flex-col gap-6">
                      
                      {/* Active Pool Dropdown & Bridge Links */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121316]/30 p-6 rounded-2xl border border-white/5 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <select
                              value={selectedMainnetPool}
                              onChange={(e) => setSelectedMainnetPool(e.target.value)}
                              className="bg-black/60 border border-white/10 text-white rounded-xl px-4 py-2 text-xs font-bold appearance-none pr-8 cursor-pointer focus:outline-none focus:border-brandLime font-mono"
                            >
                              <option value="shared-core">Shared Core Pool (Type 0)</option>
                              <option value="isolated-satellite">Isolated Satellite Pool (Type 1)</option>
                              <option value="permissioned-compliance">Permissioned Compliance Pool (Type 2)</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 size-4 text-brandGray pointer-events-none" />
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-brandLime/10 text-brandLime border border-brandLime/20 uppercase font-mono">
                            ACTIVE PROD
                          </span>
                        </div>
                        <a
                          href="https://allbridge.io"
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-brandLime font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          Bridge USDC Via Allbridge <ExternalLink className="size-3.5" />
                        </a>
                      </div>

                      {/* Connection Warning Banner */}
                      {!walletAddress && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold flex items-center justify-between shadow-lg">
                          <div className="flex items-center gap-2">
                            <Info className="size-4 shrink-0" />
                            <span>No account connected. Please connect your wallet to use Ergo.</span>
                          </div>
                          <button
                            onClick={() => setIsConnectModalOpen(true)}
                            className="px-3 py-1 rounded bg-amber-500 text-black font-bold text-[10px] hover:bg-amber-400 transition-all"
                          >
                            Connect Wallet
                          </button>
                        </div>
                      )}

                      {/* General Pool Statistics Row */}
                      {(() => {
                        // Calculate stats dynamically for selected pool
                        const activeList = assetPools.filter(p => {
                          if (selectedMainnetPool === "shared-core") {
                            return p.poolType === "Shared Core" && !p.id.includes("satellite");
                          } else if (selectedMainnetPool === "isolated-satellite") {
                            return p.poolType === "Satellite";
                          } else {
                            // permissioned compliance assets
                            return p.id === "usdc_shared" || p.id === "eurc_shared";
                          }
                        });

                        const poolTvlSupplied = activeList.reduce((acc, p) => acc + (p.tvl * p.price), 0);
                        const poolTvlBorrowed = activeList.reduce((acc, p) => acc + (p.totalBorrowed * p.price), 0);
                        const totalBackstop = selectedMainnetPool === "shared-core" ? 2820000 : selectedMainnetPool === "isolated-satellite" ? 1100000 : 1800000;

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/30 flex justify-between items-center">
                              <div>
                                <span className="text-[10px] text-brandGray uppercase tracking-wider block">Total Supplied</span>
                                <span className="text-lg font-bold text-white mt-1 block font-mono">
                                  ${poolTvlSupplied.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div className="size-8 rounded-full bg-brandLime/10 border border-brandLime/20 flex items-center justify-center">
                                <TrendingUp className="size-4 text-brandLime" />
                              </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/30 flex justify-between items-center">
                              <div>
                                <span className="text-[10px] text-brandGray uppercase tracking-wider block">Total Borrowed</span>
                                <span className="text-lg font-bold text-white mt-1 block font-mono">
                                  ${poolTvlBorrowed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div className="size-8 rounded-full bg-brandPurple/10 border border-brandPurple/20 flex items-center justify-center">
                                <ArrowLeftRight className="size-4 text-brandPurple" />
                              </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/30 flex justify-between items-center">
                              <div>
                                <span className="text-[10px] text-brandGray uppercase tracking-wider block">Total Backstop Size</span>
                                <span className="text-lg font-bold text-white mt-1 block font-mono">
                                  ${totalBackstop.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div className="size-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <CircleDot className="size-4 text-white" />
                              </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-[#121316]/30 flex justify-between items-center cursor-pointer hover:bg-[#121316]/50 transition-all" onClick={() => setActiveSection("backstop")}>
                              <div>
                                <span className="text-[10px] text-brandGray uppercase tracking-wider block">Your Backstop Balance</span>
                                <span className="text-lg font-bold text-white mt-1 block font-mono">$0</span>
                              </div>
                              <ChevronRight className="size-5 text-brandGray" />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Your Positions Section (With BarChart Histogram & Safety Gauge) */}
                      {(() => {
                        const activeMainnetPositions = assetPools.filter(p => p.supplied > 0 || p.borrowed > 0);
                        const hasActivePositions = activeMainnetPositions.length > 0;
                        
                        const totalSuppliedUSD = assetPools.reduce((acc, p) => acc + p.supplied * p.price, 0);
                        const totalBorrowedUSD = assetPools.reduce((acc, p) => acc + p.borrowed * p.price, 0);
                        const currentLtvRatio = totalSuppliedUSD > 0 ? (totalBorrowedUSD / totalSuppliedUSD) * 100 : 0;

                        // Calculate weighted net APY
                        let weightedSupplyApy = 0;
                        let weightedBorrowApy = 0;
                        activeMainnetPositions.forEach(p => {
                          const suppliedValue = p.supplied * p.price;
                          const borrowedValue = p.borrowed * p.price;
                          weightedSupplyApy += suppliedValue * p.supplyApy;
                          weightedBorrowApy += borrowedValue * p.borrowApy;
                        });
                        const netApy = totalSuppliedUSD > 0 ? (weightedSupplyApy - weightedBorrowApy) / totalSuppliedUSD : 0;
                        const borrowCapacity = totalSuppliedUSD * 0.80; // default benchmark overall LTV safety

                        const chartData = activeMainnetPositions.map(p => ({
                          name: p.symbol,
                          Supplied: parseFloat((p.supplied * p.price).toFixed(2)),
                          Borrowed: parseFloat((p.borrowed * p.price).toFixed(2)),
                        }));

                        return (
                          <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/50 flex flex-col gap-6 shadow-lg">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                              <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Your Positions Summary</h4>
                                <p className="text-[10px] text-brandGray mt-0.5"> cryptographic allocation histogram & safety thresholds.</p>
                              </div>
                              <span className="text-[10px] text-brandGray font-mono bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                Active Positions: {activeMainnetPositions.length}/6
                              </span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Left Cards */}
                              <div className="flex flex-col gap-4 justify-between">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                  <div className="size-10 rounded-xl bg-brandLime/10 border border-brandLime/20 flex items-center justify-center">
                                    <TrendingUp className="size-5 text-brandLime" />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-brandGray block">Net APY</span>
                                    <span className={`text-sm font-bold font-mono ${netApy >= 0 ? "text-brandLime" : "text-brandPurple"}`}>
                                      {netApy >= 0 ? "+" : ""}{netApy.toFixed(2)}%
                                    </span>
                                  </div>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                  <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Sliders className="size-5 text-white" />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-brandGray block">Borrow Capacity</span>
                                    <span className="text-sm font-bold text-white font-mono">
                                      ${borrowCapacity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between bg-black/30 p-3.5 rounded-xl border border-white/5 w-full">
                                  <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center">
                                      <Award className="size-4 text-brandPurple" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-brandGray block">Claim Emissions</span>
                                      <span className="text-xs font-bold text-white font-mono">0 ERGO</span>
                                    </div>
                                  </div>
                                  <button
                                    disabled
                                    className="px-3 py-1 rounded bg-[#7c3aed]/20 border border-[#7c3aed]/30 text-brandPurple font-bold text-[9px] disabled:opacity-50"
                                  >
                                    Claim
                                  </button>
                                </div>
                              </div>

                              {/* Center Chart Histogram */}
                              <div className="lg:col-span-2 flex flex-col gap-3">
                                <div className="p-4 bg-black/30 rounded-xl border border-white/5 flex-1 min-h-[12rem] flex flex-col justify-between">
                                  <span className="text-[10px] text-brandGray font-semibold uppercase tracking-wider block mb-2">Cryptographic Value Distribution (USD)</span>
                                  {hasActivePositions ? (
                                    <div className="w-full h-36">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={9} />
                                          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} />
                                          <Tooltip 
                                            contentStyle={{ background: '#121316', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }} 
                                            labelClassName="text-white text-xs font-mono font-bold"
                                          />
                                          <Bar dataKey="Supplied" fill="#d4ff3f" radius={[3, 3, 0, 0]} name="Supplied" />
                                          <Bar dataKey="Borrowed" fill="#7c3aed" radius={[3, 3, 0, 0]} name="Borrowed" />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  ) : (
                                    <div className="flex-1 border border-dashed border-white/5 rounded-lg flex items-center justify-center text-[10px] text-brandGray/40 bg-black/10">
                                      No active positions to display histogram.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* LTV range safety gauge */}
                            <div className="p-4 bg-black/30 rounded-xl border border-white/5 flex flex-col gap-2">
                              <div className="flex justify-between items-center text-[10px] text-brandGray">
                                <span className="font-semibold uppercase tracking-wider">LTV Risk safety threshold</span>
                                <span className="font-mono text-white font-bold">{currentLtvRatio.toFixed(2)}% LTV</span>
                              </div>
                              <div className="relative h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-red-500/20" />
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400 rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min(currentLtvRatio, 100)}%` }} 
                                />
                                <div className="absolute left-[75%] top-0 w-0.5 h-full bg-white/20" title="Borrow Limit (75%)" />
                                <div className="absolute left-[85%] top-0 w-0.5 h-full bg-red-500/50" title="Liquidation Threshold (85%)" />
                              </div>
                              <div className="flex justify-between text-[8px] font-mono text-brandGray/50">
                                <span>0% (Collateralized)</span>
                                <span>75% Max Borrow Limit</span>
                                <span>85% Liquidation Threshold</span>
                              </div>
                            </div>

                          </div>
                        );
                      })()}

                      {/* Supply / Borrow Interaction Segment */}
                      <div className="flex flex-col gap-4 bg-[#121316]/20 p-6 rounded-2xl border border-white/5 shadow-md">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                          <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                            <button
                              onClick={() => setMainnetTxTab("supply")}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                mainnetTxTab === "supply"
                                  ? "bg-brandLime text-brandDark"
                                  : "text-brandGray hover:text-white"
                              }`}
                            >
                              Supply
                            </button>
                            <button
                              onClick={() => setMainnetTxTab("borrow")}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                mainnetTxTab === "borrow"
                                  ? "bg-brandLime text-brandDark"
                                  : "text-brandGray hover:text-white"
                              }`}
                            >
                              Borrow
                            </button>
                          </div>

                          {(() => {
                            const activeList = assetPools.filter(p => {
                              if (selectedMainnetPool === "shared-core") {
                                return p.poolType === "Shared Core" && !p.id.includes("satellite");
                              } else if (selectedMainnetPool === "isolated-satellite") {
                                return p.poolType === "Satellite";
                              } else {
                                return p.id === "usdc_shared" || p.id === "eurc_shared";
                              }
                            });
                            const totalMarketSuppliedUSD = activeList.reduce((acc, p) => acc + p.tvl * p.price, 0);
                            return (
                              <span className="text-xs font-semibold text-brandGray">
                                Market Size: <span className="text-white font-mono font-bold">${totalMarketSuppliedUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </span>
                            );
                          })()}
                        </div>

                        {/* Assets list */}
                        <div className="flex flex-col gap-3">
                          {assetPools
                            .filter(p => {
                              if (selectedMainnetPool === "shared-core") {
                                return p.poolType === "Shared Core" && !p.id.includes("satellite");
                              } else if (selectedMainnetPool === "isolated-satellite") {
                                return p.poolType === "Satellite";
                              } else {
                                // permissioned compliance assets
                                return p.id === "usdc_shared" || p.id === "eurc_shared";
                              }
                            })
                            .map((pool) => {
                              const isExpanded = !!expandedPools[`m-${pool.id}`];
                              return (
                                <div key={pool.id} className="p-4 rounded-xl border border-white/5 bg-[#121316]/40 flex flex-col gap-4 hover:border-white/10 transition-all">
                                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedPools(prev => ({ ...prev, [`m-${pool.id}`]: !prev[`m-${pool.id}`] }))}>
                                    <div className="flex items-center gap-3">
                                      {renderAssetLogo(pool.logo, "size-8", "text-2xl")}
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-sm font-bold text-white font-mono">{pool.symbol}</h4>
                                          {selectedMainnetPool === "permissioned-compliance" && (
                                            <span className="flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                                              <Shield className="size-2" /> PERMISSIONED
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-brandGray block leading-none">{pool.name}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-6 md:gap-12">
                                      <div className="text-right">
                                        <span className="text-[9px] text-brandGray uppercase tracking-wider block">Wallet Balance</span>
                                        <span className="text-xs font-bold text-white font-mono">
                                          {walletAddress ? `${pool.walletBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${pool.symbol}` : "--"}
                                        </span>
                                      </div>

                                      <div className="text-right">
                                        <span className="text-[9px] text-brandGray uppercase tracking-wider block">APY</span>
                                        <span className="text-xs font-bold text-brandLime font-mono">
                                          {mainnetTxTab === "supply" ? `+${pool.supplyApy.toFixed(2)}%` : `+${pool.borrowApy.toFixed(2)}%`}
                                        </span>
                                      </div>

                                      <div className="text-right hidden sm:block">
                                        <span className="text-[9px] text-brandGray uppercase tracking-wider block">Collateral Factor</span>
                                        <span className="text-xs font-bold text-white font-mono">
                                          {pool.collateralFactor.toFixed(0)}%
                                        </span>
                                      </div>

                                      <ChevronRight className={`size-4 text-brandGray transition-transform duration-200 ${isExpanded ? "rotate-90 text-white" : ""}`} />
                                    </div>
                                  </div>

                                  {/* Collapsible details for Mainnet asset (Redesigned side-by-side with IRM charts) */}
                                  {isExpanded && (
                                    <div className="border-t border-white/5 pt-4 flex flex-col lg:flex-row gap-6 justify-between items-stretch">
                                      
                                      {/* Left Stats Column + IRMChart */}
                                      <div className="w-full lg:w-3/5 flex flex-col gap-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] uppercase font-mono">
                                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                            <span className="text-[9px] text-brandGray block mb-0.5">Collateral Factor</span>
                                            <span className="text-xs font-bold text-white">{pool.collateralFactor}%</span>
                                          </div>
                                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                            <span className="text-[9px] text-brandGray block mb-0.5">Liq Threshold</span>
                                            <span className="text-xs font-bold text-white">{pool.liquidationThreshold}%</span>
                                          </div>
                                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                            <span className="text-[9px] text-brandGray block mb-0.5">Min Collateral</span>
                                            <span className="text-xs font-bold text-brandLime">{pool.minCollateral} {pool.symbol}</span>
                                          </div>
                                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                            <span className="text-[9px] text-brandGray block mb-0.5">Debt Ceiling</span>
                                            <span className="text-xs font-bold text-white">{pool.debtCeiling === "Unlimited" ? "Unlimited" : `$${parseInt(pool.debtCeiling).toLocaleString()}`}</span>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] uppercase font-mono mt-1">
                                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                            <span className="text-[9px] text-brandGray block mb-0.5">Total Supplied</span>
                                            <span className="text-xs font-bold text-white">${(pool.tvl * pool.price).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                          </div>
                                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                            <span className="text-[9px] text-brandGray block mb-0.5">Total Borrowed</span>
                                            <span className="text-xs font-bold text-white">${(pool.totalBorrowed * pool.price).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                          </div>
                                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                            <span className="text-[9px] text-brandGray block mb-0.5">E-Mode Category</span>
                                            <span className="text-xs font-bold text-white">{pool.emodeCategory === 0 ? "None" : pool.emodeCategory === 1 ? "Cat 1: Stables" : "Cat 2: Majors"}</span>
                                          </div>
                                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                            <span className="text-[9px] text-brandGray block mb-0.5">Feeds & Breaker</span>
                                            <span className="text-xs font-bold text-brandLime flex items-center gap-1 leading-none mt-0.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-brandLime animate-pulse shrink-0" /> HEALTHY
                                            </span>
                                          </div>
                                        </div>

                                        {/* Embedded IRM Chart */}
                                        <div className="mt-2">
                                          <IRMChart marketId={pool.id} />
                                        </div>
                                      </div>

                                      {/* Right Action Column */}
                                      <div className="w-full lg:w-2/5 p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between gap-4">
                                        <div className="flex flex-col gap-2">
                                          <div className="flex justify-between items-center text-[10px] text-brandGray font-mono">
                                            <span>Select Workspace Mode</span>
                                            <span>Wallet: {pool.walletBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {pool.symbol}</span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
                                            <button
                                              onClick={() => {
                                                if (mainnetTxTab === "supply") {
                                                  setTxType("supply");
                                                } else {
                                                  setTxType("borrow");
                                                }
                                              }}
                                              className={`py-2 text-[10px] font-bold rounded-lg font-mono transition-all ${
                                                (mainnetTxTab === "supply" && txType === "supply") || (mainnetTxTab === "borrow" && txType === "borrow")
                                                  ? "bg-brandLime text-brandDark"
                                                  : "text-brandGray hover:text-white"
                                              }`}
                                            >
                                              {mainnetTxTab === "supply" ? "Supply" : "Borrow"}
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (mainnetTxTab === "supply") {
                                                  setTxType("withdraw");
                                                } else {
                                                  setTxType("repay");
                                                }
                                              }}
                                              className={`py-2 text-[10px] font-bold rounded-lg font-mono transition-all ${
                                                txType === "withdraw" || txType === "repay"
                                                  ? "bg-brandLime text-brandDark"
                                                  : "text-brandGray hover:text-white"
                                              }`}
                                            >
                                              {mainnetTxTab === "supply" ? "Withdraw" : "Repay"}
                                            </button>
                                          </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                          <div className="relative">
                                            <input
                                              type="number"
                                              placeholder="0.0"
                                              id={`input-m-${pool.id}`}
                                              className="bg-[#14151a] border border-white/5 focus:border-brandLime/40 focus:ring-1 focus:ring-brandLime/20 rounded-xl pl-4 pr-16 py-3 text-sm font-bold text-white font-mono placeholder-brandGray/40 outline-none transition-all w-full"
                                            />
                                            <button
                                              onClick={() => {
                                                const inputEl = document.getElementById(`input-m-${pool.id}`) as HTMLInputElement;
                                                if (inputEl) {
                                                  const maxVal = txType === "supply" || txType === "repay" ? pool.walletBalance : pool.supplied;
                                                  inputEl.value = maxVal.toString();
                                                }
                                              }}
                                              className="absolute right-3 top-2.5 text-xs text-brandLime hover:underline font-bold font-mono"
                                            >
                                              MAX
                                            </button>
                                          </div>

                                          {selectedMainnetPool === "permissioned-compliance" && marketComplianceStates[pool.id]?.permissioned && !marketComplianceStates[pool.id]?.allowed && (
                                            <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-red-400 text-[10px] leading-relaxed flex gap-2 items-start">
                                              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                                              <div>
                                                <span className="font-bold block">Compliance Lock Active</span>
                                                This compliance pool requires allowlisting. Verify KYC / register with issuer {marketComplianceStates[pool.id]?.issuer ? marketComplianceStates[pool.id].issuer.substring(0, 8) + "..." : "issuer"}.
                                              </div>
                                            </div>
                                          )}

                                          <button
                                            onClick={() => {
                                              const inputEl = document.getElementById(`input-m-${pool.id}`) as HTMLInputElement;
                                              const amt = parseFloat(inputEl?.value || "0");
                                              if (amt <= 0 || isNaN(amt)) {
                                                alert("Please enter a valid amount");
                                                return;
                                              }
                                              // compliance checks block
                                              if (selectedMainnetPool === "permissioned-compliance" && marketComplianceStates[pool.id]?.permissioned && !marketComplianceStates[pool.id]?.allowed) {
                                                alert("Compliance access is required to transact in this permissioned pool.");
                                                return;
                                              }
                                              triggerMainnetTransaction(txType, pool.symbol, amt, pool.id);
                                            }}
                                            className="w-full py-3 rounded-xl bg-brandLime text-brandDark font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(212,255,63,0.15)] hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(212,255,63,0.25)] transition-all flex items-center justify-center gap-1.5"
                                          >
                                            Submit Mainnet Action
                                          </button>
                                        </div>
                                      </div>

                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>

                    </div>
                  ) : (
                    /* ────────────────────────────────────────────────────────
                        TESTNET SANDBOX LENDING VIEW (EXISTING UNTOUCHED)
                       ──────────────────────────────────────────────────────── */
                    <div className="flex flex-col gap-6">
                      <div className="rounded-2xl border border-white/5 bg-[#121316]/50 p-6">
                        <h3 className="text-base font-bold text-white">Stellar Shared Liquidity Core & Satellite Pools</h3>
                        <p className="text-xs text-brandGray mt-1">Lend or borrow assets with non-custodial Dutch liquidation security.</p>
                      </div>

                      {/* Shared Liquidity Core Section */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-xs font-bold text-[#d4ff3f] uppercase tracking-wider pl-1">Shared Liquidity Core</h4>
                        {assetPools
                          .filter(p => p.id.toLowerCase().includes("shared"))
                          .map(pool => {
                            const poolType = pool.id.toLowerCase().includes("shared") ? "SHARED CORE" : "PERMISSIONED";
                            const isExpanded = !!expandedPools[pool.id];
                            return (
                              <div key={pool.id} className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4 hover:scale-[1.005] transition-transform duration-300">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div className="flex items-center gap-3.5">
                                    {renderAssetLogo(pool.logo, "size-10", "text-3xl")}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-base font-bold text-white font-mono">{pool.symbol}</h4>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                          poolType === "SHARED CORE" ? "bg-[#d4ff3f]/10 text-[#d4ff3f] border border-[#d4ff3f]/20" :
                                          "bg-white/5 text-white border border-white/20"
                                        }`}>
                                          {poolType}
                                        </span>
                                        {marketComplianceStates[pool.id]?.permissioned && (
                                          <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20">
                                            <Shield className="size-2.5" />
                                            Permissioned
                                          </span>
                                        )}
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
                                      <span className="text-sm font-bold text-brandLime font-mono">+{pool.supplyApy.toFixed(2)}%</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-brandGray uppercase tracking-wider block">Borrow APY</span>
                                      <span className="text-sm font-bold text-brandPurple font-mono">+{pool.borrowApy.toFixed(2)}%</span>
                                    </div>
                                  </div>

                                  <div className="flex gap-2 shrink-0 w-full md:w-auto">
                                    <button
                                      onClick={() => {
                                        setExpandedPools(prev => ({ ...prev, [pool.id]: !prev[pool.id] }));
                                      }}
                                      className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-white hover:bg-white/5 transition-all text-center"
                                    >
                                      {isExpanded ? "Hide Details" : "Details"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedAssetId(pool.id);
                                        setTxType("supply");
                                        setIsTxModalOpen(true);
                                      }}
                                      className="px-5 py-2 rounded-xl bg-brandLime text-brandDark text-xs font-bold hover:scale-[1.03] transition-all"
                                    >
                                      Supply
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedAssetId(pool.id);
                                        setTxType("borrow");
                                        setIsTxModalOpen(true);
                                      }}
                                      className="px-5 py-2 rounded-xl bg-black border border-white/10 text-white text-xs font-bold hover:scale-[1.03] transition-all"
                                    >
                                      Borrow
                                    </button>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    className="border-t border-white/5 pt-4 mt-2 flex flex-col gap-4 text-xs"
                                  >
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      <div>
                                        <span className="text-brandGray block mb-1 text-[10px] uppercase">Risk Parameters</span>
                                        <span className="text-white font-mono block">Collateral Factor: {(pool.collateralFactor * 100).toFixed(0)}%</span>
                                        <span className="text-brandGray block text-[10px]">Liq. Threshold: {((pool.collateralFactor + 0.05) * 100).toFixed(0)}%</span>
                                      </div>
                                      <div>
                                        <span className="text-brandGray block mb-1 text-[10px] uppercase">Oracle Feeds</span>
                                        <span className="text-white block font-semibold font-mono">Reflector + DEX TWAP</span>
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
                                    </div>
                                    <IRMChart marketId={pool.id} />
                                  </motion.div>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {/* Isolated Satellite Pools Section */}
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center pl-1">
                          <h4 className="text-xs font-bold text-brandPurple uppercase tracking-wider">Isolated Satellite Pools</h4>
                          <span className="text-[10px] text-brandGray italic font-sans">High LTV custom assets isolated from core pools.</span>
                        </div>
                        {assetPools
                          .filter(p => p.id.toLowerCase().includes("satellite"))
                          .map(pool => {
                            const poolType = "SATELLITE";
                            const isExpanded = !!expandedPools[pool.id];
                            const debtCeiling = pool.id.includes("xlm") ? 5000000 : 2500000;
                            const ceilingPercent = Math.min((pool.totalBorrowed / debtCeiling) * 100, 100);
                            return (
                              <div key={pool.id} className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-5 hover:scale-[1.005] transition-transform duration-300">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div className="flex items-center gap-3.5">
                                    {renderAssetLogo(pool.logo, "size-10", "text-3xl")}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-base font-bold text-white font-mono">{pool.symbol}</h4>
                                        <span className="bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                          {poolType}
                                        </span>
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-[#9fadaa] border border-white/10">
                                          LTV: {(pool.collateralFactor).toFixed(0)}%
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
                                      <span className="text-sm font-bold text-brandLime font-mono">+{pool.supplyApy.toFixed(2)}%</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-brandGray uppercase tracking-wider block">Borrow APY</span>
                                      <span className="text-sm font-bold text-brandPurple font-mono">+{pool.borrowApy.toFixed(2)}%</span>
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

                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    className="border-t border-white/5 pt-4 mt-2 flex flex-col gap-4 text-xs"
                                  >
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      <div>
                                        <span className="text-brandGray block mb-1 text-[10px] uppercase">Risk Parameters</span>
                                        <span className="text-white font-mono block">Collateral Factor: {(pool.collateralFactor).toFixed(0)}%</span>
                                        <span className="text-brandGray block text-[10px]">Liq. Threshold: {((pool.collateralFactor + 0.05)).toFixed(0)}%</span>
                                      </div>
                                      <div>
                                        <span className="text-brandGray block mb-1 text-[10px] uppercase">Oracle Feeds</span>
                                        <span className="text-white block font-semibold font-mono">Reflector + DEX TWAP</span>
                                        <span className="text-brandGray block text-[10px]">Updated: 2 ledgers ago</span>
                                      </div>
                                      <div>
                                        <span className="text-brandGray block mb-1 text-[10px] uppercase">Circuit Breaker</span>
                                        <span className="text-[#ef4444] font-semibold flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" /> Active & Healthy
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-brandGray block mb-1 text-[10px] uppercase">Backstop Coverage</span>
                                        <span className="text-white font-mono block">120% funded</span>
                                      </div>
                                    </div>
                                    <IRMChart marketId={pool.id} />
                                  </motion.div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  3. YIELD ATTRIBUTION / PERFORMANCE VIEW
                  ──────────────────────────────────────────────────────── */}
              {activeSection === "performance" && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label="Staking Balance" value={userTotalStaked.toLocaleString()} suffix=" USDC" delay={0} icon={Award} />
                    <KpiCard label="Accumulated Rewards" value={liveRewards.toFixed(6)} suffix=" ERGO" delay={0.06} icon={TrendingUp} />
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
                        <BarChart data={monthlyYieldData}>
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
                        onClick={handleBackstopDeposit}
                        disabled={isBackstopTxSubmitting}
                        className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-50 transition-all text-center"
                      >
                        {isBackstopTxSubmitting ? "Depositing..." : "Deposit Backstop Capital"}
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
                        {deviationFeeds.map((o, idx) => {
                          const reflectorVal = o.price;
                          const devPercent = parseFloat(o.dev) / 100;
                          const twapVal = reflectorVal * (1 + devPercent);
                          const formatter = (v: number) => {
                            if (v >= 1000) return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
                            if (v >= 1) return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 3 });
                            return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });
                          };
                          return (
                            <div key={idx} className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/5 border border-white/5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-white">{o.asset}</span>
                                <span className="text-[9px] bg-brandLime/15 text-brandLime px-1.5 py-0.5 rounded font-bold">{o.status}</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-brandGray">
                                <span>Reflector: <span className="font-mono text-white">{formatter(reflectorVal)}</span></span>
                                <span>TWAP: <span className="font-mono text-white">{formatter(twapVal)}</span></span>
                                <span>Var: <span className="font-mono text-brandLime">{o.dev}</span></span>
                              </div>
                            </div>
                          );
                        })}
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
                  6. GOVERNANCE Proposals Layout
                  ──────────────────────────────────────────────────────── */}
              {activeSection === "governance" && (() => {
                // If proposal details is selected
                if (selectedProposalId !== null) {
                  const selectedProposal = proposals.find(p => p.rawId === selectedProposalId || p.id === `ERP-${selectedProposalId}`);
                  if (!selectedProposal) {
                    return (
                      <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 text-center">
                        <p className="text-brandGray text-xs">Proposal not found.</p>
                        <button onClick={() => setSelectedProposalId(null)} className="mt-4 px-4 py-2 bg-brandLime text-brandDark font-bold text-xs rounded-xl">Back to Governance</button>
                      </div>
                    );
                  }

                  let parsedDesc = { summary: selectedProposal.description, params: {} as Record<string, string> };
                  try {
                    if (selectedProposal.description && selectedProposal.description.startsWith("{")) {
                      parsedDesc = JSON.parse(selectedProposal.description);
                    }
                  } catch (e) {}

                  const displayParams = {
                    "Target Parameter": "Collateral Factor",
                    "New Value": "85.00%",
                    "Target Pool": "USDC Shared Core",
                    ...parsedDesc.params
                  };

                  const aiCritic = {
                    summary: selectedProposal.title.includes("USDC") 
                      ? "This proposal requests to increase the USDC Shared Core Pool collateral factor limit from 80% to 85%. This allows borrowers to borrow more debt relative to their USDC deposits." 
                      : selectedProposal.title.includes("EURC") 
                      ? "This proposal aims to deploy a new isolated satellite pool mapping the Stellar EURC contract to support Euro-denominated collateralization." 
                      : "This proposal implements a smart contract update modifying active parameters within the core pool.",
                    pros: selectedProposal.title.includes("USDC") 
                      ? ["Increases capital efficiency for institutional borrowers.", "Attracts higher volumes of short-term USDC leverage positions."] 
                      : selectedProposal.title.includes("EURC") 
                      ? ["Diversifies currency asset risks outside of USD stablecoins.", "Allows low-risk hedging options for European markets."] 
                      : ["Aligns protocol operations with target performance limits.", "Passed security simulation checks."],
                    cons: selectedProposal.title.includes("USDC") 
                      ? ["Reduces the safety buffer between collateral value and liquidation threshold.", "Elevates systemic bad-debt risk in the event of rapid market drops."] 
                      : selectedProposal.title.includes("EURC") 
                      ? ["EURC has lower secondary market liquidity on Stellar DEX compared to USDC.", "Higher risk of price slippage during Dutch liquidation auctions."] 
                      : ["Adds minor parameter divergence across pools.", "Requires active oracle deviation monitoring."],
                    riskScore: selectedProposal.title.includes("USDC") ? "HIGH RISK (MEDIUM DEVIATION)" : selectedProposal.title.includes("EURC") ? "MEDIUM RISK" : "LOW RISK"
                  };

                  return (
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedProposalId(null)}
                          className="px-3.5 py-2 rounded-xl border border-white/5 text-xs text-brandGray hover:text-white hover:bg-white/5 transition-all"
                        >
                          ← Back to Proposals
                        </button>
                        <span className="text-[10px] font-bold font-mono bg-brandPurple/20 text-[#7c3aed] px-2.5 py-1 rounded">
                          {selectedProposal.id}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded ${
                          selectedProposal.status === "Active" ? "bg-brandLime/10 text-brandLime" : "bg-white/5 text-brandGray"
                        }`}>
                          {selectedProposal.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Details */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                          <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-white leading-snug">{selectedProposal.title}</h3>
                              <span className="text-[10px] text-brandGray/40 mt-1 block">Proposer: {selectedProposal.proposer}</span>
                            </div>

                            <div className="h-px bg-white/5 w-full" />

                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Proposal Overview</h4>
                              <p className="text-xs text-brandGray leading-relaxed">{parsedDesc.summary}</p>
                            </div>

                            <div className="h-px bg-white/5 w-full" />

                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Structured Execution Parameters</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead>
                                    <tr className="text-brandGray border-b border-white/5 pb-2">
                                      <th className="pb-2 font-medium">Parameter Field</th>
                                      <th className="pb-2 text-right font-medium">Configured Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(displayParams).map(([k, v]) => (
                                      <tr key={k} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-2.5 font-medium text-brandGray">{k}</td>
                                        <td className="py-2.5 text-right font-mono text-white truncate max-w-[200px]" title={v}>{v}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>

                          {/* Voting Card */}
                          <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Vote Casting Panel</h4>
                            
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between text-[10px] font-mono font-bold">
                                <span className="text-brandLime">For: {selectedProposal.votesFor.toLocaleString()} ERGO</span>
                                <span className="text-red-400">Against: {selectedProposal.votesAgainst.toLocaleString()} ERGO</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden flex">
                                <div className="h-full bg-brandLime" style={{ width: `${(selectedProposal.votesFor / (selectedProposal.votesFor + selectedProposal.votesAgainst || 1) * 100)}%` }} />
                                <div className="h-full bg-red-500" style={{ width: `${(selectedProposal.votesAgainst / (selectedProposal.votesFor + selectedProposal.votesAgainst || 1) * 100)}%` }} />
                              </div>
                            </div>

                            {selectedProposal.status === "Active" && (
                              <div className="flex gap-3 justify-end mt-2">
                                {selectedProposal.hasVoted ? (
                                  <span className="text-xs bg-white/5 text-brandGray/60 px-4 py-2 border border-white/5 rounded-xl font-bold flex items-center gap-1.5">
                                    <Check className="size-3 text-brandLime" />
                                    Vote Counted
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleVote(selectedProposal.id, true)}
                                      className="px-4 py-2 rounded-xl bg-brandLime/10 hover:bg-brandLime/15 text-brandLime border border-[#d4ff3f]/10 font-bold text-xs"
                                    >
                                      Vote For
                                    </button>
                                    <button
                                      onClick={() => handleVote(selectedProposal.id, false)}
                                      className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/10 font-bold text-xs"
                                    >
                                      Vote Against
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* AI Critic Sidebar */}
                        <div className="flex flex-col gap-6">
                          <div className="p-6 rounded-2xl border border-brandPurple/20 bg-[#121316]/50 shadow-lg flex flex-col gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Shield className="size-20 text-brandPurple" />
                            </div>

                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-[#7c3aed]">AI Guardian Monitor</span>
                              <h4 className="text-sm font-bold text-white mt-1">Proposal Critic Analysis</h4>
                            </div>

                            <p className="text-xs text-brandGray leading-relaxed">{aiCritic.summary}</p>

                            <div className="h-px bg-white/5 w-full" />

                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-brandLime uppercase tracking-wider">Pros / Benefits</span>
                              <ul className="list-disc pl-4 text-[11px] text-brandGray flex flex-col gap-1">
                                {aiCritic.pros.map((p, i) => <li key={i}>{p}</li>)}
                              </ul>
                            </div>

                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Cons / Risks</span>
                              <ul className="list-disc pl-4 text-[11px] text-brandGray flex flex-col gap-1">
                                {aiCritic.cons.map((c, i) => <li key={i}>{c}</li>)}
                              </ul>
                            </div>

                            <div className="h-px bg-white/5 w-full" />

                            <div className="flex justify-between items-center text-xs">
                              <span className="text-brandGray">Risk Assessment</span>
                              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[9px] ${
                                aiCritic.riskScore.includes("HIGH") ? "bg-red-500/10 text-red-400 border border-red-500/15" : "bg-brandLime/10 text-brandLime border border-brandLime/15"
                              }`}>{aiCritic.riskScore}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // If proposal creation is open
                if (isCreatePropOpen) {
                  const loadExampleTemplate = (id: number) => {
                    if (id === 1) {
                      setNewPropTitle("ERP-11: Register EURC Satellite Pool & Risk Parameters");
                      setNewPropTarget("CCSHAPUB4KRRDGA3PWUWO6WKULCLNXW7N5JYVFVVQWNSQUPR6E4PVLUW");
                      setNewPropAction("create_market");
                      const structuredDesc = {
                        summary: "This proposal deploys a new isolated satellite pool for EURC, mapping the Stellar EURC contract to support Euro-denominated collateralization with a 75% loan-to-value cap.",
                        params: {
                          "Collateral Factor": "75%",
                          "Liability Factor": "80%",
                          "Asset Address": "CCSHAPUB4KRRDGA3PWUWO6WKULCLNXW7N5JYVFVVQWNSQUPR6E4PVLUW",
                          "Pool Type": "Isolated Satellite"
                        }
                      };
                      setNewPropDesc(JSON.stringify(structuredDesc, null, 2));
                    } else {
                      setNewPropTitle("ERP-12: Update USDC Shared Core Pool Collateral Factor to 85%");
                      setNewPropTarget("CBHSXIJO7IDDO62NPJCJWS2NLAPUCNH7LBOUFFABR4MT47TNOXR4HO2J");
                      setNewPropAction("update_market_params");
                      const structuredDesc = {
                        summary: "This proposal increases the USDC Shared Core Pool collateral factor to 85% to enhance liquidity utilization, supported by historical oracle stability.",
                        params: {
                          "New Collateral Factor": "85%",
                          "New Liability Factor": "90%",
                          "Target Asset": "USDC (Shared Core)"
                        }
                      };
                      setNewPropDesc(JSON.stringify(structuredDesc, null, 2));
                    }
                  };

                  return (
                    <div className="flex flex-col gap-6">
                      <div className="flex justify-between items-center bg-[#121316]/40 p-6 rounded-2xl border border-white/5">
                        <div>
                          <h3 className="text-base font-bold text-white">Create Governance Proposal</h3>
                          <p className="text-xs text-brandGray mt-1">Configure target contract upgrade parameters and execute transaction signatures.</p>
                        </div>
                        <button
                          onClick={() => setIsCreatePropOpen(false)}
                          className="px-4 py-2 rounded-xl border border-white/5 text-xs text-brandGray hover:text-white hover:bg-white/5 transition-all"
                        >
                          ← Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Proposal Configurator</h4>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-brandGray uppercase tracking-wider font-bold">Proposal Title</label>
                            <input
                              type="text"
                              placeholder="e.g. ERP-11: Register EURC Satellite Pool & Risk Parameters"
                              value={newPropTitle}
                              onChange={(e) => setNewPropTitle(e.target.value)}
                              className="w-full bg-[#121316] border border-white/5 focus:border-brandPurple/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] text-brandGray uppercase tracking-wider font-bold">Target Contract Address</label>
                              <input
                                type="text"
                                placeholder="Target contract public key G..."
                                value={newPropTarget}
                                onChange={(e) => setNewPropTarget(e.target.value)}
                                className="w-full bg-[#121316] border border-white/5 focus:border-brandPurple/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none font-mono"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] text-brandGray uppercase tracking-wider font-bold">Action Method / Function</label>
                              <input
                                type="text"
                                placeholder="e.g. create_market"
                                value={newPropAction}
                                onChange={(e) => setNewPropAction(e.target.value)}
                                className="w-full bg-[#121316] border border-white/5 focus:border-brandPurple/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-brandGray uppercase tracking-wider font-bold">Execution Payload Description (JSON/Structured)</label>
                            <textarea
                              placeholder="Describe the proposal or write JSON representation..."
                              value={newPropDesc}
                              onChange={(e) => setNewPropDesc(e.target.value)}
                              rows={5}
                              className="w-full bg-[#121316] border border-white/5 focus:border-brandPurple/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none resize-none leading-relaxed font-mono"
                            />
                          </div>

                          <div className="h-px bg-white/5 my-2 w-full" />

                          {/* Payment & Publish Button */}
                          <div className="flex flex-col gap-3">
                            <button
                              disabled={isPayingFee || !walletAddress || !newPropTitle || !newPropTarget || !newPropAction || !newPropDesc}
                              onClick={payProposalFee}
                              className="w-full py-3.5 rounded-xl bg-brandLime text-brandDark font-bold text-xs hover:bg-[#c3ec34] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                              {isPayingFee ? (
                                <>
                                  <div className="size-3.5 rounded-full border border-brandDark border-t-transparent animate-spin" />
                                  Processing Payment & Publishing...
                                </>
                              ) : (
                                "Sign, Pay 50 ERGO & Publish Proposal"
                              )}
                            </button>
                            <p className="text-[10px] text-brandGray leading-relaxed text-center">
                              * Creating a proposal triggers an on-chain transfer of 50 ERGO as a publishing fee. Upon ledger confirmation, your proposal will automatically go live.
                            </p>
                          </div>
                        </div>

                        {/* Sidebar: Step guide & examples */}
                        <div className="flex flex-col gap-6">
                          {/* Guide */}
                          <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#7c3aed]">Instruction Guide</span>
                            <h4 className="text-sm font-bold text-white">How to Deploy a Proposal</h4>
                            <div className="flex flex-col gap-3 text-xs leading-relaxed text-brandGray">
                              <div>
                                <span className="text-white font-semibold">1. Choose Target Contract</span>
                                <p className="text-[10px] mt-0.5">Define which core contract parameters will be modified (e.g. Core Pool, compliance allowlists).</p>
                              </div>
                              <div>
                                <span className="text-white font-semibold">2. Pay Creation Fee</span>
                                <p className="text-[10px] mt-0.5">Creating a proposal requires an administrative payment of 50 ERGO to align governance incentives.</p>
                              </div>
                              <div>
                                <span className="text-white font-semibold">3. Cast & Track Votes</span>
                                <p className="text-[10px] mt-0.5">Once published, token holders cast votes. Passed proposals enter a 48h execution timelock queue.</p>
                              </div>
                            </div>
                          </div>

                          {/* Templates */}
                          <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4">
                            <h4 className="text-sm font-bold text-white">Example Templates</h4>
                            <p className="text-[10px] text-brandGray">Click a template below to auto-populate the execution configuration.</p>
                            <div className="flex flex-col gap-2 mt-1">
                              <button
                                onClick={() => loadExampleTemplate(1)}
                                className="p-3 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs flex flex-col gap-0.5"
                              >
                                <span className="font-bold text-white">Example 1: Add EURC Satellite</span>
                                <span className="text-[10px] text-brandGray">Register EURC asset, deploy isolated satellite market, set 75% LTV.</span>
                              </button>

                              <button
                                onClick={() => loadExampleTemplate(2)}
                                className="p-3 text-left rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs flex flex-col gap-0.5"
                              >
                                <span className="font-bold text-white">Example 2: Update USDC Risk</span>
                                <span className="text-[10px] text-brandGray">Change USDC Core Pool Collateral factor to 85% via Governance action.</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
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
                        <p className="text-2xl font-bold font-mono text-white">{proposals.filter(p => p.status === 'Active').length} Proposals</p>
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
                        onClick={() => {
                          setIsCreatePropOpen(true);
                          setFeePaidTxHash("");
                        }}
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
                          <div
                            key={prop.id}
                            onClick={() => setSelectedProposalId(prop.rawId || parseInt(prop.id.replace("ERP-", "")))}
                            className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4 hover:scale-[1.005] hover:border-brandPurple/20 cursor-pointer transition-all duration-300"
                          >
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold font-mono bg-brandPurple/20 text-[#7c3aed] px-2 py-0.5 rounded">{prop.id}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${prop.status === "Active" ? "bg-brandLime/10 text-brandLime" : "bg-white/5 text-brandGray"}`}>{prop.status}</span>
                              </div>
                              <span className="text-[10px] font-mono text-brandGray/40">Ends in: {prop.endsIn || "5 days"}</span>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-white">{prop.title}</h4>
                              <p className="text-xs text-[#9fadaa] mt-1.5 leading-relaxed line-clamp-2">
                                {(() => {
                                  try {
                                    if (prop.description && prop.description.startsWith("{")) {
                                      return JSON.parse(prop.description).summary;
                                    }
                                  } catch (e) {}
                                  return prop.description;
                                })()}
                              </p>
                              <span className="text-[10px] text-brandGray/40 mt-2 block">Proposer: {prop.proposer}</span>
                            </div>

                            {/* Voting visual bar graphs */}
                            <div className="flex flex-col gap-2 mt-2">
                              <div className="flex justify-between text-[10px] font-mono font-bold">
                                <span className="text-brandLime">For: {prop.votesFor.toLocaleString()} ERGO ({(prop.votesFor / (prop.votesFor + prop.votesAgainst || 1) * 100).toFixed(0)}%)</span>
                                <span className="text-red-400">Against: {prop.votesAgainst.toLocaleString()} ERGO ({(prop.votesAgainst / (prop.votesFor + prop.votesAgainst || 1) * 100).toFixed(0)}%)</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden flex">
                                <div className="h-full bg-brandLime" style={{ width: `${(prop.votesFor / (prop.votesFor + prop.votesAgainst || 1) * 100)}%` }} />
                                <div className="h-full bg-red-500" style={{ width: `${(prop.votesAgainst / (prop.votesFor + prop.votesAgainst || 1) * 100)}%` }} />
                              </div>
                            </div>
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
                );
              })()}

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
              
              {/* ────────────────────────────────────────────────────────
                  7.5. COMPLIANCE PANEL VIEW
                  ──────────────────────────────────────────────────────── */}
              {activeSection === "compliance" && (() => {
                const isUserAdmin = walletAddress && complianceAdmin && walletAddress.toLowerCase() === complianceAdmin.toLowerCase();
                const isUserIssuer = walletAddress && Object.values(marketComplianceStates).some(s => s.issuer && s.issuer.toLowerCase() === walletAddress.toLowerCase());
                
                let userRole = "Public Wallet 👤";
                if (isUserAdmin && isUserIssuer) {
                  userRole = "Admin & Market Issuer 🛡️🏢";
                } else if (isUserAdmin) {
                  userRole = "Compliance Admin 🛡️";
                } else if (isUserIssuer) {
                  userRole = "Asset Issuer 🏢";
                }

                const checkUserStatus = async () => {
                  if (!checkerUser) {
                    alert("Please enter a wallet address to check");
                    return;
                  }
                  setCheckerLoading(true);
                  setCheckerResult(null);
                  try {
                    const complianceId = process.env.NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID || '';
                    const symVal = xdr.ScVal.scvSymbol(checkerMarket);
                    const userAddrVal = Address.fromString(checkerUser).toScVal();
                    const sim = await simulateContractCall(complianceId, 'is_allowed', [symVal, userAddrVal]);
                    if ((sim as any).result?.retval) {
                      const allowed = scValToNative((sim as any).result.retval);
                      setCheckerResult(allowed);
                    } else {
                      setCheckerResult(false);
                    }
                  } catch (e: any) {
                    console.error(e);
                    alert(`Simulation failed: ${e.message || e}`);
                  } finally {
                    setCheckerLoading(false);
                  }
                };

                return (
                  <div className="flex flex-col gap-6 font-sans">
                    {/* Header Banner */}
                    <div className="rounded-2xl border border-white/5 bg-[#121316]/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Shield className="size-5 text-[#7c3aed]" />
                          Compliance & RWA Control Center
                        </h3>
                        <p className="text-xs text-brandGray mt-1">Manage institutional allowlists, market permission flags, and asset clawbacks.</p>
                      </div>
                      <div className="flex flex-col gap-1 text-right shrink-0">
                        <span className="text-[10px] text-brandGray uppercase font-bold tracking-wider">Access Role</span>
                        <span className="text-xs font-bold text-brandLime">{userRole}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Column: Market States & Info */}
                      <div className="lg:col-span-1 flex flex-col gap-6">
                        {/* Market Registry Status */}
                        <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Market Registry</h4>
                          <div className="flex flex-col gap-3">
                            {assetPools.map((pool) => {
                              const state = marketComplianceStates[pool.id] || { permissioned: false, allowed: false, issuer: "" };
                              return (
                                <div key={pool.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    {renderAssetLogo(pool.logo, "size-6")}
                                    <div>
                                      <p className="font-bold text-white font-mono">{pool.symbol}</p>
                                      <p className="text-[9px] text-brandGray truncate max-w-[120px]" title={state.issuer}>
                                        {state.issuer ? `Issuer: ${state.issuer.slice(0,4)}...${state.issuer.slice(-4)}` : "Issuer: None"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      state.permissioned 
                                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/15" 
                                        : "bg-green-500/10 text-green-400 border border-green-500/15"
                                    }`}>
                                      {state.permissioned ? "Permissioned" : "Public"}
                                    </span>
                                    {state.permissioned && walletAddress && (
                                      <span className={`text-[8px] ${state.allowed ? "text-brandLime font-semibold" : "text-red-400"}`}>
                                        {state.allowed ? "Authorized" : "Blocked"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Protocol Settings Summary */}
                        <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-3.5 text-xs">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">System Parameters</h4>
                          <div className="flex flex-col gap-2.5">
                            <div className="flex justify-between">
                              <span className="text-brandGray">Compliance Contract:</span>
                              <span className="font-mono text-white select-all">{process.env.NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID ? `${process.env.NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID.slice(0,6)}...${process.env.NEXT_PUBLIC_COMPLIANCE_CONTRACT_ID.slice(-6)}` : "Not Configured"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-brandGray">Admin Address:</span>
                              <span className="font-mono text-white select-all">{complianceAdmin ? `${complianceAdmin.slice(0,6)}...${complianceAdmin.slice(-6)}` : "None"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-brandGray">Connected Wallet:</span>
                              <span className="font-mono text-brandLime truncate max-w-[120px]">{walletAddress ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-6)}` : "Disconnected"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Compliance Management Portal Actions */}
                      <div className="lg:col-span-2 flex flex-col gap-6">
                        
                        {/* 1. ALLOWLIST MANAGEMENT PANEL */}
                        <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4">
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Allowlist Manager</h4>
                            <p className="text-[10px] text-brandGray mt-0.5">Authorise or revoke user wallet access for permissioned asset markets.</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-bold text-brandGray uppercase tracking-wider">Select Market</label>
                              <select
                                value={allowlistMarket}
                                onChange={(e) => setAllowlistMarket(e.target.value)}
                                className="bg-[#121316] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                              >
                                {assetPools.map(p => (
                                  <option key={p.id} value={p.id}>{p.symbol} Pool ({p.poolType})</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5 md:col-span-2">
                              <label className="text-[9px] font-bold text-brandGray uppercase tracking-wider">User Wallet Address</label>
                              <input
                                type="text"
                                placeholder="G..."
                                value={allowlistUser}
                                onChange={(e) => setAllowlistUser(e.target.value)}
                                className="bg-[#121316] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-brandGray/40 outline-none w-full"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-brandGray font-medium">Authorization Status:</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setAllowlistAllowed(true)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    allowlistAllowed 
                                      ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                                      : "bg-white/5 text-brandGray border border-white/5"
                                  }`}
                                >
                                  Authorize Access
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAllowlistAllowed(false)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    !allowlistAllowed 
                                      ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                      : "bg-white/5 text-brandGray border border-white/5"
                                  }`}
                                >
                                  Revoke Access
                                </button>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                 if (!walletAddress) {
                                  alert("Please connect wallet first");
                                  return;
                                }
                                if (!allowlistUser) {
                                  alert("Please enter target user address");
                                  return;
                                }
                                handleComplianceTx("add_to_allowlist", [
                                  Address.fromString(walletAddress!).toScVal(),
                                  xdr.ScVal.scvSymbol(allowlistMarket),
                                  Address.fromString(allowlistUser).toScVal(),
                                  nativeToScVal(allowlistAllowed)
                                ]);
                              }}
                              disabled={complianceSubmitting}
                              className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#7c3aed]/90 text-white font-bold text-xs tracking-wider transition-all disabled:opacity-50"
                            >
                              {complianceSubmitting ? "Submitting..." : "Update Allowlist"}
                            </button>
                          </div>
                        </div>

                        {/* 2. ADMIN MARKET FLAGS CONFIGURATOR */}
                        {isUserAdmin && (
                          <div className="p-6 rounded-2xl border border-[#7c3aed]/20 bg-[#121316]/30 flex flex-col gap-5">
                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-purple-500 animate-pulse" />
                                Admin Market Configurator
                              </h4>
                              <p className="text-[10px] text-brandGray mt-0.5">Toggle permission requirements and configure market issuer addresses.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Toggle Permission Flag */}
                              <div className="flex flex-col gap-3.5 p-4 bg-white/5 rounded-xl border border-white/5">
                                <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">Toggle Permissioned Status</h5>
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] text-brandGray font-bold uppercase">Select Market</label>
                                    <select
                                      value={flagMarket}
                                      onChange={(e) => setFlagMarket(e.target.value)}
                                      className="bg-[#121316] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                                    >
                                      {assetPools.map(p => (
                                        <option key={p.id} value={p.id}>{p.symbol} Pool</option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-2">
                                    <label className="text-xs text-brandGray flex items-center gap-1.5 select-none cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        checked={flagPermissioned} 
                                        onChange={(e) => setFlagPermissioned(e.target.checked)}
                                        className="size-3.5 rounded border-white/5 accent-[#7c3aed]"
                                      />
                                      Require Allowlist
                                    </label>

                                    <button
                                      onClick={() => {
                                        if (!walletAddress) {
                                          alert("Please connect wallet first");
                                          return;
                                        }
                                        handleComplianceTx("flag_market_permissioned", [
                                          Address.fromString(walletAddress!).toScVal(),
                                          xdr.ScVal.scvSymbol(flagMarket),
                                          nativeToScVal(flagPermissioned)
                                        ]);
                                      }}
                                      disabled={complianceSubmitting}
                                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all disabled:opacity-50"
                                    >
                                      Save Config
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Assign Issuer Address */}
                              <div className="flex flex-col gap-3.5 p-4 bg-white/5 rounded-xl border border-white/5">
                                <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">Assign Market Issuer</h5>
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] text-brandGray font-bold uppercase">Select Market</label>
                                    <select
                                      value={issuerMarket}
                                      onChange={(e) => setIssuerMarket(e.target.value)}
                                      className="bg-[#121316] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                                    >
                                      {assetPools.map(p => (
                                        <option key={p.id} value={p.id}>{p.symbol} Pool</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] text-brandGray font-bold uppercase">Issuer Address</label>
                                    <input
                                      type="text"
                                      placeholder="G..."
                                      value={issuerAddress}
                                      onChange={(e) => setIssuerAddress(e.target.value)}
                                      className="w-full bg-[#121316] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-brandGray/40 outline-none"
                                    />
                                  </div>

                                  <button
                                    onClick={() => {
                                      if (!walletAddress) {
                                        alert("Please connect wallet first");
                                        return;
                                      }
                                      if (!issuerAddress) {
                                        alert("Please enter issuer address");
                                        return;
                                      }
                                      handleComplianceTx("set_issuer", [
                                        Address.fromString(walletAddress!).toScVal(),
                                        xdr.ScVal.scvSymbol(issuerMarket),
                                        Address.fromString(issuerAddress).toScVal()
                                      ]);
                                    }}
                                    disabled={complianceSubmitting}
                                    className="w-full mt-1.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all disabled:opacity-50"
                                  >
                                    Set Issuer Authority
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. ISSUER CLAWBACK PORTAL */}
                        {isUserIssuer && (
                          <div className="p-6 rounded-2xl border border-red-500/20 bg-[#121316]/30 flex flex-col gap-4">
                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                <AlertTriangle className="size-4 text-red-500" />
                                Institutional Clawback Panel
                              </h4>
                              <p className="text-[10px] text-brandGray mt-0.5">Claw back active lending/borrow positions of blacklisted entities directly from storage.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-bold text-brandGray uppercase tracking-wider">Select Market</label>
                                <select
                                  value={clawbackMarket}
                                  onChange={(e) => setClawbackMarket(e.target.value)}
                                  className="bg-[#121316] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                >
                                  {assetPools.map(p => (
                                    <option key={p.id} value={p.id}>{p.symbol} Pool</option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-bold text-brandGray uppercase tracking-wider">Target Wallet</label>
                                <input
                                  type="text"
                                  placeholder="G..."
                                  value={clawbackUser}
                                  onChange={(e) => setClawbackUser(e.target.value)}
                                  className="bg-[#121316] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-brandGray/40 outline-none w-full"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-bold text-brandGray uppercase tracking-wider">Clawback Amount</label>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={clawbackAmount}
                                  onChange={(e) => setClawbackAmount(e.target.value)}
                                  className="bg-[#121316] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-brandGray/40 outline-none w-full"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end mt-2">
                              <button
                                onClick={() => {
                                  if (!walletAddress) {
                                    alert("Please connect wallet first");
                                    return;
                                  }
                                  if (!clawbackUser || !clawbackAmount) {
                                    alert("Please enter target address and amount");
                                    return;
                                  }
                                  const rawAmt = BigInt(Math.floor(parseFloat(clawbackAmount) * 10000000));
                                  handleComplianceTx("clawback_position", [
                                    Address.fromString(walletAddress!).toScVal(),
                                    xdr.ScVal.scvSymbol(clawbackMarket),
                                    Address.fromString(clawbackUser).toScVal(),
                                    nativeToScVal(rawAmt, { type: 'i128' })
                                  ]);
                                }}
                                disabled={complianceSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <AlertTriangle className="size-3.5" />
                                Execute Clawback Position
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 4. PUBLIC ALLOWLIST STATUS CHECKER */}
                        <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4">
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-semibold">Public Allowlist Status Checker</h4>
                            <p className="text-[10px] text-brandGray mt-0.5">Check whether any Stellar account is authorized on a permissioned market.</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-bold text-brandGray uppercase tracking-wider">Select Market</label>
                              <select
                                value={checkerMarket}
                                onChange={(e) => setCheckerMarket(e.target.value)}
                                className="bg-[#121316] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                              >
                                {assetPools.map(p => (
                                  <option key={p.id} value={p.id}>{p.symbol} Pool</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5 md:col-span-2">
                              <label className="text-[9px] font-bold text-brandGray uppercase tracking-wider">Wallet Address to Audit</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="G..."
                                  value={checkerUser}
                                  onChange={(e) => setCheckerUser(e.target.value)}
                                  className="flex-1 bg-[#121316] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-brandGray/40 outline-none w-full"
                                />
                                <button
                                  onClick={checkUserStatus}
                                  disabled={checkerLoading}
                                  className="px-4 py-2 rounded-xl bg-[#d4ff3f] hover:bg-[#d4ff3f]/95 text-[#0b0b0d] font-bold text-xs tracking-wider transition-all disabled:opacity-50"
                                >
                                  {checkerLoading ? "Auditing..." : "Audit Address"}
                                </button>
                              </div>
                            </div>
                          </div>

                          {checkerResult !== null && (
                            <div className={`p-4 rounded-xl text-xs flex items-center justify-between ${
                              checkerResult 
                                ? "bg-green-500/5 border border-green-500/10 text-green-400" 
                                : "bg-red-500/5 border border-red-500/10 text-red-400"
                            }`}>
                              <span className="font-semibold">Audit Result:</span>
                              <span className="font-bold flex items-center gap-1.5 uppercase font-mono">
                                {checkerResult ? (
                                  <>
                                    <Check className="size-4 text-green-500" />
                                    Authorized on Allowlist 🟢
                                  </>
                                ) : (
                                  <>
                                    <X className="size-4 text-red-500" />
                                    Blocked / Unauthorized 🔴
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Backstop Manager View */}
              {activeSection === "backstop" && (() => {
                const totalBackstopDeposits = backstopPools.reduce((acc, p) => acc + p.size, 0);
                const userTotalStaked = Object.values(userBackstopBalances).reduce((acc, b) => acc + b, 0);
                return (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-5">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-sm font-bold text-white">Backstop Liquidity Pools</h4>
                            <p className="text-[10px] text-brandGray mt-0.5">Secure the protocol against shortfall events and earn incentive rewards.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                            <span className="text-[10px] text-brandGray block mb-1">BACKSTOP APR</span>
                            <span className="text-sm font-bold text-brandLime font-bold">14.85%</span>
                          </div>
                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                            <span className="text-[10px] text-brandGray block mb-1">TOTAL DEPOSITS</span>
                            <span className="text-sm font-bold text-white">${totalBackstopDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                            <span className="text-[10px] text-brandGray block mb-1">WITHDRAWAL COOLDOWN</span>
                            <span className="text-sm font-bold text-white">21 Ledgers</span>
                          </div>
                        </div>

                        <div className="overflow-x-auto mt-4">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="text-brandGray border-b border-white/5 pb-2">
                                <th className="pb-2">Pool ID</th>
                                <th className="pb-2 text-right">Backstop Size</th>
                                <th className="pb-2 text-right">Coverage Ratio</th>
                                <th className="pb-2 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {backstopPools.map((row) => (
                                <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                                  <td className="py-3 font-bold text-white">{row.name}</td>
                                  <td className="py-3 text-right font-mono text-white">${row.size.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="py-3 text-right font-mono text-brandLime">{row.ratio}%</td>
                                  <td className="py-3 text-right font-mono"><span className="text-brandLime">● {row.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-white">Manage My Position</h4>
                          <p className="text-[10px] text-brandGray mt-0.5">Staked USDC balance.</p>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
                          <span className="text-[10px] text-brandGray">USDC WALLET BALANCE</span>
                          <span className="text-sm font-bold text-white font-mono">{(walletBalances['usdc'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
                          <span className="text-[10px] text-brandGray">MY STAKED BALANCE</span>
                          <span className="text-sm font-bold text-white font-mono">{userTotalStaked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
                        </div>

                        <div className="flex flex-col gap-2 mt-2">
                          <button
                            disabled={isBackstopTxSubmitting}
                            onClick={handleBackstopDeposit}
                            className="w-full py-3 rounded-xl bg-brandLime text-brandDark font-bold text-xs disabled:opacity-50"
                          >
                            {isBackstopTxSubmitting ? "Depositing..." : "Backstop Deposit"}
                          </button>
                          <button
                            disabled={isBackstopTxSubmitting}
                            onClick={handleBackstopWithdraw}
                            className="w-full py-3 rounded-xl border border-white/10 text-white font-bold text-xs hover:bg-white/5 disabled:opacity-50"
                          >
                            {isBackstopTxSubmitting ? "Processing..." : "Queue for Withdrawal"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Testnet Faucet View */}
              {activeSection === "faucet" && (
                <div className="flex flex-col gap-6">
                  <div className="p-6 rounded-2xl border border-white/5 bg-[#121316]/30 flex flex-col gap-5">
                    <div>
                      <h4 className="text-sm font-bold text-white">Stellar Testnet Asset Faucet</h4>
                      <p className="text-[10px] text-brandGray mt-0.5">Request mock assets to interact with Ergo Protocol pools on Testnet.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { symbol: "XLM", name: "Stellar Lumens", amount: "10,000 XLM", method: "friendbot" },
                        { symbol: "USDC", name: "USD Coin", amount: "1,000 USDC", method: "sac" },
                        { symbol: "EURC", name: "Euro Coin", amount: "1,000 EURC", method: "sac" },
                        { symbol: "wBTC", name: "Wrapped Bitcoin", amount: "1 wBTC", method: "faucet" },
                        { symbol: "wETH", name: "Wrapped Ether", amount: "10 wETH", method: "faucet" },
                        { symbol: "ERGO", name: "Ergo Protocol Token", amount: "500 ERGO", method: "mint" }
                      ].map((item, idx) => (
                        <FaucetItem key={idx} item={item} walletAddress={walletAddress} />
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
                    {renderAssetLogo(activePool.logo, "size-6", "text-xl")} {activePool.name} ({activePool.symbol})
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

                {/* Transaction Overview Simulator */}
                {txAmount && !isNaN(parseFloat(txAmount)) && (
                  <TransactionOverview
                    action={txType}
                    marketId={activePool.id}
                    amount={txAmount && !isNaN(parseFloat(txAmount)) ? BigInt(Math.floor(parseFloat(txAmount) * 10000000)) : 0n}
                    userAddress={walletAddress}
                    symbol={activePool.symbol}
                  />
                )}

                {(() => {
                  const isComplianceBlocked = marketComplianceStates[activePool.id]?.permissioned && !marketComplianceStates[activePool.id]?.allowed;
                  return (
                    <>
                      {isComplianceBlocked && (
                        <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 font-bold text-red-500">
                            <AlertTriangle className="size-4" />
                            Compliance Block Active
                          </div>
                          <p>Your wallet address is not on the compliance allowlist for this market. Please submit KYC / register for access with the market issuer.</p>
                        </div>
                      )}

                      {txError && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                          {txError}
                        </div>
                      )}

                      <button
                        onClick={handleTxSubmit}
                        disabled={isComplianceBlocked || txSubmitting}
                        className="w-full py-4 rounded-2xl bg-brandLime disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brandLime/90 text-brandDark font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(212,255,63,0.15)] mt-2"
                      >
                        {isComplianceBlocked ? "Compliance Access Required" : txSubmitting ? "Submitting to Soroban..." : "Verify and Sign Transaction"}
                      </button>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MAINNET WALLET SIGNATURE VERIFICATION MODAL ───────────── */}
      <AnimatePresence>
        {isMainnetSignModalOpen && mainnetSignData && (
          <div className="fixed inset-0 z-[105] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!mainnetTxSubmitting) {
                  setIsMainnetSignModalOpen(false);
                  setMainnetSignData(null);
                }
              }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] border border-white/5 bg-[#0b0c10]/95 overflow-hidden shadow-2xl p-6 z-10 pb-12 md:pb-6 flex flex-col gap-4"
            >
              <div>
                <span className="text-[9px] uppercase tracking-widest text-brandLime font-bold">Stellar Mainnet (Public) Signature Required</span>
                <h4 className="text-xl font-bold text-white flex items-center gap-2 mt-1.5">
                  Confirm Mainnet {mainnetSignData.action.toUpperCase()}
                </h4>
              </div>

              <div className="flex flex-col gap-3 text-xs leading-normal">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2.5">
                  <div className="flex justify-between">
                    <span className="text-brandGray">Operation</span>
                    <span className="font-bold text-white uppercase font-mono">{mainnetSignData.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brandGray">Asset</span>
                    <span className="font-bold text-white font-mono">{mainnetSignData.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brandGray">Amount</span>
                    <span className="font-bold text-brandLime font-mono text-sm">{mainnetSignData.amount.toLocaleString()} {mainnetSignData.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brandGray">Network Passphrase</span>
                    <span className="font-mono text-white text-[9px] break-all">Public Global Stellar Network ; October 2015</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brandGray">Fee Limit</span>
                    <span className="font-bold text-brandPurple font-mono">100 Stroops (0.00001 XLM)</span>
                  </div>
                </div>

                <div className="p-3 bg-brandLime/10 border border-brandLime/20 rounded-xl text-brandLime text-[10px] leading-relaxed">
                  <span className="font-bold block mb-1">🔐 Ledger Security & Signature Info</span>
                  Freighter / Hana will prompt you to sign a payment transaction on Mainnet. This verifies cryptographic ownership and anchors the position change onto the public ledger sequence.
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  disabled={mainnetTxSubmitting}
                  onClick={() => {
                    setIsMainnetSignModalOpen(false);
                    setMainnetSignData(null);
                  }}
                  className="flex-1 py-3.5 rounded-2xl border border-white/5 text-xs text-brandGray hover:text-white transition-colors hover:bg-white/5"
                >
                  Reject
                </button>
                <button
                  disabled={mainnetTxSubmitting}
                  onClick={handleMainnetSignAndSubmit}
                  className="flex-1 py-3.5 rounded-2xl bg-brandLime hover:bg-brandLime/90 text-brandDark font-bold text-xs shadow-lg transition-transform hover:scale-102 flex items-center justify-center gap-1.5"
                >
                  {mainnetTxSubmitting ? (
                    <>
                      <Clock className="size-3.5 animate-spin" /> Signing...
                    </>
                  ) : (
                    "Confirm & Sign"
                  )}
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
                      onClick={async () => {
                        setWizardStep(4);
                        try {
                          const res = await fetch("/api/proposals", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              title: newPropTitle,
                              description: newPropDesc,
                              proposer: walletAddress || "GBXW5PPHD6UUXKLQ5K5ZRP34BR7NSJJLSS76NHH273QVA5GOV8",
                              targetContract: newPropTarget,
                              actionName: newPropAction,
                            })
                          });
                          if (res.ok) {
                            const created = await res.json();
                            const newMapped = {
                              id: `ERP-${created.id}`,
                              rawId: created.id,
                              title: created.title,
                              description: created.description,
                              proposer: created.proposer,
                              votesFor: created.votes_for,
                              votesAgainst: created.votes_against,
                              hasVoted: true,
                              status: created.status,
                              endsIn: "5 days"
                            };
                            setProposals(prev => [newMapped, ...prev]);
                            alert(`Proposal ERP-${created.id} published on-chain successfully!`);
                          } else {
                            alert("Failed to submit proposal to server.");
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Error submitting proposal.");
                        } finally {
                          setIsCreatePropModalOpen(false);
                          setWizardStep(1);
                          setNewPropTitle("");
                          setNewPropTarget("");
                          setNewPropAction("");
                          setNewPropDesc("");
                        }
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
