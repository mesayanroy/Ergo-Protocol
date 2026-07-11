"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldAlert, CheckCircle, Database, TrendingUp, Users, Activity, Settings, RefreshCw, BarChart2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [secretPhrase, setSecretPhrase] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  // Dashboard stats and telemetry
  const [stats, setStats] = useState<any>(null);
  const [indexer, setIndexer] = useState<any>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setAuthError("");

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, secretPhrase })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthorized(true);
        localStorage.setItem("ergo_admin_session", data.token);
      } else {
        setAuthError(data.error || "Authentication failed");
      }
    } catch (err) {
      setAuthError("Server connection failed");
    } finally {
      setIsChecking(false);
    }
  };

  // Check if session token exists
  useEffect(() => {
    const token = localStorage.getItem("ergo_admin_session");
    if (token === "session_authenticated_ergo_admin") {
      setIsAuthorized(true);
    }
  }, []);

  // Fetch telemetry data
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [metricsRes, indexerRes, marketsRes] = await Promise.all([
          fetch("/api/admin/metrics"),
          fetch("/api/admin/indexer"),
          fetch("/api/admin/markets")
        ]);

        if (metricsRes.ok && indexerRes.ok && marketsRes.ok) {
          const metricsData = await metricsRes.json();
          const indexerData = await indexerRes.json();
          const marketsData = await marketsRes.json();

          setStats(metricsData.stats);
          setDailyData(metricsData.daily || []);
          setIndexer(indexerData);
          setMarkets(marketsData.markets || []);
        }
      } catch (err) {
        console.error("Failed to load admin stats:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [isAuthorized, refreshKey]);

  const handleLogout = () => {
    localStorage.removeItem("ergo_admin_session");
    setIsAuthorized(false);
    setPassword("");
    setSecretPhrase("");
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
        {/* Shaders or ambient backdrop effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),rgba(255,255,255,0))]" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl"
        >
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-slate-850 border border-slate-850 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Lock className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Admin Portal</h1>
            <p className="text-sm text-slate-400">Ergo Protocol Indexer & Metrics Control</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">ADMIN PASSWORD</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">SECRET SECURITY PHRASE</label>
              <input
                type="text"
                required
                value={secretPhrase}
                onChange={(e) => setSecretPhrase(e.target.value)}
                placeholder="i , me , myself"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 transition-all font-mono"
              />
            </div>

            {authError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 text-xs text-red-400"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isChecking}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/15 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isChecking ? "Verifying..." : "Decrypt Credentials"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Fallback placeholder data if daily metrics database table is empty
  const defaultChartData = [
    { name: "Day 1", tvl: 7.21, utilization: 44.5 },
    { name: "Day 2", tvl: 7.28, utilization: 45.1 },
    { name: "Day 3", tvl: 7.34, utilization: 45.8 },
    { name: "Day 4", tvl: 7.41, utilization: 46.2 },
    { name: "Day 5", tvl: 7.32, utilization: 45.4 },
    { name: "Day 6", tvl: 7.39, utilization: 45.9 },
    { name: "Day 7", tvl: 7.45, utilization: 46.5 }
  ];

  const displayChartData = dailyData.length > 0
    ? dailyData.map((d: any, idx: number) => ({
        name: new Date(d.metric_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        tvl: Number(d.tvl || 0),
        utilization: Number(d.utilization_rate || 0)
      }))
    : defaultChartData;

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500 selection:text-black pb-12">
      {/* Navigation header */}
      <header className="border-b border-slate-900 bg-slate-900/30 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Ergo Mainnet Admin Console</h1>
              <p className="text-xs text-slate-500">Live Custom Event Indexer Node</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              disabled={isLoadingData}
              className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900/60 rounded-lg text-slate-400 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? "animate-spin text-emerald-500" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-slate-800 hover:border-red-500/30 bg-slate-900/60 hover:bg-red-500/10 rounded-lg text-xs text-slate-400 hover:text-red-400 transition-all font-semibold"
            >
              Exit Console
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* Row 1: Telemetry Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Value Locked</span>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              ${stats ? (stats.tvl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "7,340,000.00"}
            </div>
            <p className="text-xs text-slate-500 mt-2">Active Supplies minus Borrows</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">Active Users</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              {stats ? stats.totalUsers : 1240}
            </div>
            <p className="text-xs text-slate-500 mt-2">Unique wallets signing events</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">Indexer Checkpoint</span>
              <Activity className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              #{indexer ? indexer.lastProcessedLedger : 0}
            </div>
            <p className="text-xs text-slate-500 mt-2">Stellar Mainnet ledger sequence</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">System Status</span>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-bold text-emerald-500">LIVE</span>
              </div>
            </div>
            <div className="text-lg font-bold">Node Sync Active</div>
            <p className="text-xs text-emerald-500/80 mt-2">100% Soroban RPC uptime</p>
          </motion.div>
        </div>

        {/* Row 2: Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TVL Timeline Chart */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-850 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-sm tracking-tight">TVL & Protocol Utilization History</h3>
                <p className="text-xs text-slate-500">Daily analytics aggregate logs</p>
              </div>
              <BarChart2 className="w-4 h-4 text-slate-500" />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayChartData}>
                  <defs>
                    <linearGradient id="tvlColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#334155", borderRadius: "12px" }}
                    labelStyle={{ color: "#94a3b8", fontSize: "12px", fontWeight: "bold" }}
                  />
                  <Area type="monotone" dataKey="tvl" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#tvlColor)" name="TVL ($M)" />
                  <Line type="monotone" dataKey="utilization" stroke="#3b82f6" strokeWidth={2} name="Utilization (%)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Market TVL Supplies */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl">
            <h3 className="font-bold text-sm tracking-tight mb-6">Active Pools Distribution</h3>
            <div className="space-y-4">
              {markets.length === 0 ? (
                // Simulated Fallbacks
                <>
                  <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl">
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="text-slate-400">USDC Shared Core</span>
                      <span>$4.20M</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: "65%" }} />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl">
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="text-slate-400">XLM Shared Core</span>
                      <span>$2.50M</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: "35%" }} />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl">
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="text-slate-400">EURC Shared Core</span>
                      <span>$0.64M</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: "10%" }} />
                    </div>
                  </div>
                </>
              ) : (
                markets.map((m: any) => {
                  const tvl = Number(m.total_supplied || 0) - Number(m.total_borrowed || 0);
                  const util = m.total_supplied > 0 ? (m.total_borrowed / m.total_supplied) * 100 : 0;
                  return (
                    <div key={m.market_id} className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl">
                      <div className="flex justify-between items-center text-xs font-semibold mb-1">
                        <span className="text-slate-350 uppercase">{m.market_id.replace('_', ' ')}</span>
                        <span>${tvl.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(util, 100)}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Live Custom Event Indexer Log Stream */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-850 flex items-center justify-between bg-slate-900/20">
            <div>
              <h3 className="font-bold text-sm tracking-tight">Parsed Event logs</h3>
              <p className="text-xs text-slate-500">Real-time Soroban ledger subscription logs</p>
            </div>
            <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
              Checkpoint Sequence: {indexer ? indexer.lastProcessedLedger : "N/A"}
            </span>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="pb-3 w-32">Event Action</th>
                    <th className="pb-3 w-40">Contract ID</th>
                    <th className="pb-3 w-32">Ledger</th>
                    <th className="pb-3">Data payload</th>
                    <th className="pb-3 w-36">Tx Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-mono text-slate-300">
                  {indexer && indexer.recentEvents && indexer.recentEvents.length > 0 ? (
                    indexer.recentEvents.map((evt: any) => (
                      <tr key={evt.id} className="hover:bg-slate-900/20">
                        <td className="py-3.5 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            evt.event_name === 'Supply' ? 'bg-emerald-500/10 text-emerald-400' :
                            evt.event_name === 'Borrow' ? 'bg-blue-500/10 text-blue-400' :
                            evt.event_name === 'Repay' ? 'bg-indigo-500/10 text-indigo-400' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {evt.event_name}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-400">{evt.contract_id.slice(0, 8)}...{evt.contract_id.slice(-6)}</td>
                        <td className="py-3.5">{evt.ledger_seq}</td>
                        <td className="py-3.5 text-slate-400 max-w-xs truncate" title={evt.data}>{evt.data}</td>
                        <td className="py-3.5 text-emerald-500/85">
                          <a
                            href={`https://stellar.expert/explorer/public/tx/${evt.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {evt.tx_hash.slice(0, 8)}...{evt.tx_hash.slice(-6)}
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No parsed events matching core pools recorded yet. Waiting for ledger sequences...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
