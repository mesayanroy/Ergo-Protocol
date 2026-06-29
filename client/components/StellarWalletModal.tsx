"use client";
import React, { useState, useEffect } from "react";
import { useStellarWallet } from "../lib/stellar-wallet";
import { motion, AnimatePresence } from "framer-motion";

interface StellarWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WALLETS_REGISTRY = [
  {
    id: "freighter",
    name: "Freighter",
    type: "extension",
    description: "Connect using the official Stellar browser extension. Secure key storage and easy signing.",
    installUrl: "https://www.freighter.app/",
    icon: (
      <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" rx="20" fill="#1c1538" />
        <path d="M50 20L75 60H25L50 20Z" fill="#d4ff3f" />
        <circle cx="50" cy="45" r="8" fill="#1c1538" />
      </svg>
    ),
  },
  {
    id: "albedo",
    name: "Albedo",
    type: "web",
    description: "Albedo provides a secure browser link signature overlay. Works across desktop and mobile browsers.",
    icon: (
      <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" rx="20" fill="#2d1b54" />
        <circle cx="50" cy="50" r="22" stroke="#7c3aed" strokeWidth="6" />
        <circle cx="50" cy="50" r="10" fill="#d4ff3f" />
      </svg>
    ),
  },
  {
    id: "xbull",
    name: "xBull Wallet",
    type: "extension",
    description: "A powerful browser extension wallet for Stellar. Manage multiple accounts with advanced custom controls.",
    installUrl: "https://xbull.app/",
    icon: (
      <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" rx="20" fill="#2c1610" />
        <path d="M30 40C35 45 42 45 42 45L42 65C42 65 30 65 30 50V40Z" fill="#f97316" />
        <path d="M70 40C65 45 58 45 58 45L58 65C58 65 70 65 70 50V40Z" fill="#f97316" />
        <circle cx="50" cy="45" r="6" fill="#f97316" />
      </svg>
    ),
  },
  {
    id: "hana",
    name: "Hana Wallet",
    type: "extension",
    description: "Multi-chain wallet extension with dedicated support for Stellar assets and Soroban smart contract interactions.",
    installUrl: "https://www.hanawallet.me/",
    icon: (
      <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" rx="20" fill="#1b2e2a" />
        <circle cx="42" cy="42" r="12" fill="#ec4899" />
        <circle cx="58" cy="58" r="12" fill="#06b6d4" />
        <circle cx="50" cy="50" r="8" fill="#d4ff3f" />
      </svg>
    ),
  },
  {
    id: "lobstr",
    name: "LOBSTR",
    type: "mobile",
    description: "Connect your LOBSTR mobile app. Scan the QR code using your mobile device to establish connection.",
    icon: (
      <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" rx="20" fill="#0c1d1a" />
        <path d="M35 30H45V60H65V70H35V30Z" fill="#10b981" />
        <circle cx="55" cy="42" r="7" fill="#10b981" />
      </svg>
    ),
  },
  {
    id: "demo",
    name: "Demo Sandbox",
    type: "demo",
    description: "Simulate a mock connection session to preview connected account features, live stats, and custom transaction layouts.",
    icon: (
      <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" rx="20" fill="#1c1917" />
        <path d="M40 50L48 58L62 42" stroke="#d4ff3f" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export const StellarWalletModal = ({ isOpen, onClose }: StellarWalletModalProps) => {
  const {
    walletAddress,
    walletProvider,
    isConnecting,
    connectionError,
    connectWallet,
    disconnect,
    isWalletInstalled,
  } = useStellarWallet();

  const [selectedWalletId, setSelectedWalletId] = useState<string>("freighter");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recentWallet, setRecentWallet] = useState<string | null>(null);

  // Sync recent wallet on mount and selection changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      setRecentWallet(localStorage.getItem("ergo_recent_wallet"));
    }
  }, [walletAddress]);

  // Reset states when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      if (walletProvider) {
        const matchingWallet = WALLETS_REGISTRY.find(
          (w) => w.name.toLowerCase() === walletProvider.toLowerCase()
        );
        if (matchingWallet) setSelectedWalletId(matchingWallet.id);
      }
    }
  }, [isOpen, walletProvider]);

  const selectedWallet = WALLETS_REGISTRY.find((w) => w.id === selectedWalletId) || WALLETS_REGISTRY[0];

  const handleConnect = async () => {
    const success = await connectWallet(selectedWallet.id);
    if (success) {
      localStorage.setItem("ergo_recent_wallet", selectedWallet.id);
      // Close modal on successful connection
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  const filteredWallets = WALLETS_REGISTRY.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Grouping wallets
  const installedWallets = filteredWallets.filter((w) => isWalletInstalled(w.id) && w.id !== "demo");
  const otherWallets = filteredWallets.filter((w) => !isWalletInstalled(w.id) || w.id === "demo");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-4xl rounded-[2.5rem] border border-white/5 bg-[#0e0f12]/95 overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[500px] max-h-[90vh] z-10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-brandGray hover:text-white transition-colors z-20 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10"
              aria-label="Close modal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Left Panel: Navigation & Search */}
            <div className="w-full md:w-[45%] border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col justify-start bg-black/20">
              <div className="mb-6 mt-2">
                <h3 className="text-base font-bold text-white tracking-wide">Connect Wallet</h3>
                <p className="text-xs text-brandGray mt-1">Select a Stellar extension or web wallet to start.</p>
              </div>

              {/* Wallet Search */}
              <div className="relative mb-5">
                <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-brandGray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search wallets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#14151a] border border-white/5 focus:border-brandPurple/40 focus:ring-1 focus:ring-brandPurple/20 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-brandGray/60 outline-none transition-all"
                />
              </div>

              {/* Wallets scroll view */}
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] md:max-h-none pr-1">
                {/* Recent connections badge if matches query */}
                {recentWallet && searchQuery === "" && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-brandPurple/80 block mb-2 px-1">Recent Connection</span>
                    {WALLETS_REGISTRY.filter((w) => w.id === recentWallet).map((wallet) => (
                      <button
                        key={`recent-${wallet.id}`}
                        onClick={() => setSelectedWalletId(wallet.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${selectedWalletId === wallet.id ? "border-brandLime bg-brandLime/5" : "border-white/5 hover:border-white/10 bg-white/5"}`}
                      >
                        <div className="flex items-center gap-3.5">
                          {wallet.icon}
                          <div>
                            <p className="text-sm font-bold text-white">{wallet.name}</p>
                            <p className="text-[10px] text-brandGray mt-0.5">{wallet.type === "extension" ? "Browser Extension" : "Web Signer"}</p>
                          </div>
                        </div>
                        <span className="text-[9px] bg-brandPurple/20 text-brandPurple px-2 py-0.5 rounded-full font-bold">Recent</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Installed Wallets */}
                {installedWallets.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-brandLime block mb-2 px-1">Detected / Recommended</span>
                    <div className="space-y-2">
                      {installedWallets.map((wallet) => (
                        <button
                          key={wallet.id}
                          onClick={() => setSelectedWalletId(wallet.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${selectedWalletId === wallet.id ? "border-brandLime bg-brandLime/5" : "border-white/5 hover:border-white/10 bg-white/5"}`}
                        >
                          <div className="flex items-center gap-3.5">
                            {wallet.icon}
                            <div>
                              <p className="text-sm font-bold text-white">{wallet.name}</p>
                              <p className="text-[10px] text-brandGray mt-0.5">
                                {wallet.type === "extension" ? "Extension" : wallet.type === "web" ? "Web Signer" : "Sandbox"}
                              </p>
                            </div>
                          </div>
                          {isWalletInstalled(wallet.id) && (
                            <span className="text-[9px] bg-brandLime/20 text-brandLime px-2 py-0.5 rounded-full font-bold">Installed</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Wallets */}
                {otherWallets.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-brandGray/60 block mb-2 px-1">Other Available Wallets</span>
                    <div className="space-y-2">
                      {otherWallets.map((wallet) => (
                        <button
                          key={wallet.id}
                          onClick={() => setSelectedWalletId(wallet.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${selectedWalletId === wallet.id ? "border-brandLime bg-brandLime/5" : "border-white/5 hover:border-white/10 bg-white/5"}`}
                        >
                          <div className="flex items-center gap-3.5">
                            {wallet.icon}
                            <div>
                              <p className="text-sm font-bold text-white">{wallet.name}</p>
                              <p className="text-[10px] text-brandGray mt-0.5">
                                {wallet.type === "mobile" ? "Mobile Wallet" : wallet.type === "demo" ? "Sandbox Simulation" : "Web Signer"}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filteredWallets.length === 0 && (
                  <p className="text-xs text-brandGray/50 text-center py-8">No compatible Stellar wallets found.</p>
                )}
              </div>
            </div>

            {/* Right Panel: Operations & Details */}
            <div className="w-full md:w-[55%] p-8 flex flex-col justify-between bg-black/10">
              <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                {/* Details view of the selected wallet */}
                <div className="flex flex-col items-center text-center gap-4">
                  {selectedWallet.icon}
                  <div>
                    <h4 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                      {selectedWallet.name}
                      {isWalletInstalled(selectedWallet.id) && (
                        <span className="w-2 h-2 rounded-full bg-brandLime shadow-[0_0_8px_rgba(212,255,63,0.6)]" />
                      )}
                    </h4>
                    <span className="text-[10px] uppercase tracking-widest text-brandPurple font-semibold mt-1 block">
                      {selectedWallet.type === "extension" ? "Browser Extension" : selectedWallet.type === "web" ? "Web Application Gateway" : selectedWallet.type === "demo" ? "Sandbox simulator" : "Mobile Wallet Link"}
                    </span>
                  </div>

                  <p className="text-sm text-brandGray leading-relaxed max-w-sm mt-2">
                    {selectedWallet.description}
                  </p>

                  {/* Connect / Install Button Layer */}
                  {isWalletInstalled(selectedWallet.id) ? (
                    <div className="w-full mt-6">
                      {walletAddress && walletProvider?.toLowerCase() === selectedWallet.name.toLowerCase() ? (
                        <div className="flex flex-col gap-3 items-center">
                          <span className="text-xs bg-brandLime/10 text-brandLime px-4 py-2 border border-brandLime/25 rounded-2xl font-semibold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brandLime animate-pulse" />
                            Connected and Active
                          </span>
                          <button
                            onClick={disconnect}
                            className="text-xs text-red-400 hover:text-red-300 font-semibold underline mt-2"
                          >
                            Disconnect Session
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleConnect}
                          disabled={isConnecting}
                          className="w-full py-4 rounded-2xl bg-brandLime hover:bg-brandLime/90 text-brandDark font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(212,255,63,0.15)] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isConnecting ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-brandDark" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Requesting Access...
                            </>
                          ) : (
                            `Connect with ${selectedWallet.name}`
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full mt-6 flex flex-col gap-3">
                      {selectedWallet.installUrl ? (
                        <>
                          <a
                            href={selectedWallet.installUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
                          >
                            Install Extension
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <p className="text-[10px] text-brandGray/40">Extension not detected. Click above to install from the web store.</p>
                        </>
                      ) : selectedWallet.type === "mobile" ? (
                        /* Mobile LOBSTR simulated QR flow */
                        <div className="w-full bg-[#14151a] rounded-2xl p-4 border border-white/5 flex flex-col items-center gap-3">
                          {/* Simulated QR block */}
                          <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg relative">
                            {/* Standard QR representation */}
                            <svg className="w-32 h-32" viewBox="0 0 100 100" fill="black">
                              <rect x="0" y="0" width="25" height="25" />
                              <rect x="75" y="0" width="25" height="25" />
                              <rect x="0" y="75" width="25" height="25" />
                              <rect x="35" y="35" width="30" height="30" />
                              <rect x="10" y="45" width="10" height="10" />
                              <rect x="45" y="10" width="10" height="15" />
                              <rect x="80" y="45" width="10" height="20" />
                              <rect x="45" y="80" width="20" height="10" />
                            </svg>
                          </div>
                          <button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="text-xs text-brandLime hover:text-brandLime/90 font-bold tracking-wider"
                          >
                            {isConnecting ? "Simulating Scanner..." : "Simulate App Scan"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {connectionError && (
                    <div className="mt-4 w-full p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-left max-w-sm">
                      <span className="font-bold block mb-1">Connection Error</span>
                      {connectionError}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-brandGray/40 border-t border-white/5 pt-4 mt-6 text-center">
                By establishing connection, you agree to Ergo's Smart Contract Compliance protocols and Terms of Service.
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
