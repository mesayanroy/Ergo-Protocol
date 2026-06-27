"use client";

import { useState, useEffect } from "react";

export default function HomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Wallet Connection States
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [selectedWalletForDetails, setSelectedWalletForDetails] = useState<string | null>("freighter");

  // Reset errors and selections when connection modal opens/closes
  useEffect(() => {
    if (!isConnectModalOpen) {
      setConnectionError(null);
    }
  }, [isConnectModalOpen]);

  const connectFreighter = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const freighterApi = await import("@stellar/freighter-api");
      const isConnected = await freighterApi.isConnected();
      if (!isConnected) {
        throw new Error("Freighter browser extension is not installed or available.");
      }
      const res = await freighterApi.requestAccess();
      if (!res) {
        throw new Error("Connection request rejected by user.");
      }
      const addressString = typeof res === "string" ? res : res.address;
      if (!addressString) {
        throw new Error("Could not retrieve public key from Freighter.");
      }
      setWalletAddress(addressString);
      setWalletProvider("Freighter");
      setIsConnectModalOpen(false);
    } catch (err: any) {
      setConnectionError(err.message || "Failed to connect to Freighter");
    } finally {
      setIsConnecting(false);
    }
  };

  const connectAlbedo = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const albedo = (await import("@albedo-link/intent")).default;
      const result = await albedo.publicKey({});
      if (!result || !result.pubkey) {
        throw new Error("No public key returned from Albedo.");
      }
      setWalletAddress(result.pubkey);
      setWalletProvider("Albedo");
      setIsConnectModalOpen(false);
    } catch (err: any) {
      setConnectionError(err.message || "Failed to connect to Albedo");
    } finally {
      setIsConnecting(false);
    }
  };

  const connectDemoWallet = () => {
    setIsConnecting(true);
    setConnectionError(null);
    setTimeout(() => {
      setWalletAddress("GBDEMO7777777777777777777777777777777777777777777777ERGO");
      setWalletProvider("Demo Wallet");
      setIsConnectModalOpen(false);
      setIsConnecting(false);
    }, 800);
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setWalletProvider(null);
    setIsAccountModalOpen(false);
  };


  return (
    <div className="min-h-screen relative bg-brandDark text-foreground selection:bg-brandLime selection:text-brandDark">
      {/* Background radial accent glow */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-brandPurple/10 to-transparent pointer-events-none z-0" />
      
      {/* Top sticky glass header */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-white/10 shadow-[0_0_15px_rgba(212,255,63,0.15)] flex-shrink-0 bg-brandLime">
              <img 
                src="/logo.png" 
                alt="Ergo Protocol Logo" 
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <span className="font-sans font-bold text-lg tracking-tight text-white flex items-center gap-1">
              ergo <span className="text-brandLime">protocol</span>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-brandGray">
            <a href="#about" className="hover:text-white transition-colors duration-200">About</a>
            <a href="#features" className="hover:text-white transition-colors duration-200">Features</a>
            <a href="#dashboard" className="hover:text-white transition-colors duration-200">Dashboard</a>
            <a href="#use-cases" className="hover:text-white transition-colors duration-200">Use Cases</a>
            <a href="#developers" className="hover:text-white transition-colors duration-200">Developers</a>
          </nav>

          {/* CTA Launch/Connect Wallet Button */}
          <div className="hidden md:flex items-center">
            {walletAddress ? (
              <button 
                onClick={() => setIsAccountModalOpen(true)}
                className="relative inline-flex items-center justify-center px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 gap-2 hover:border-brandLime/30"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brandLime animate-pulse" />
                <span className="font-mono">{walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</span>
              </button>
            ) : (
              <button 
                onClick={() => setIsConnectModalOpen(true)}
                className="relative inline-flex items-center justify-center px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-brandDark bg-brandLime overflow-hidden group transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(212,255,63,0.35)]"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex flex-col items-center justify-center w-10 h-10 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
            aria-label="Toggle Menu"
          >
            <div className={`w-5 h-0.5 bg-white transition-transform duration-300 ${isMobileMenuOpen ? "rotate-45 translate-y-1" : "-translate-y-1"}`} />
            <div className={`w-5 h-0.5 bg-white transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-0" : "opacity-100"}`} />
            <div className={`w-5 h-0.5 bg-white transition-transform duration-300 ${isMobileMenuOpen ? "-rotate-45 -translate-y-1" : "translate-y-1"}`} />
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full glass-panel border-b border-white/5 py-6 px-6 flex flex-col gap-4 animate-fade-in shadow-2xl z-45">
            <a 
              href="#about" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-brandGray hover:text-white py-2 border-b border-white/5"
            >
              About
            </a>
            <a 
              href="#features" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-brandGray hover:text-white py-2 border-b border-white/5"
            >
              Features
            </a>
            <a 
              href="#dashboard" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-brandGray hover:text-white py-2 border-b border-white/5"
            >
              Dashboard
            </a>
            <a 
              href="#use-cases" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-brandGray hover:text-white py-2 border-b border-white/5"
            >
              Use Cases
            </a>
            <a 
              href="#developers" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-brandGray hover:text-white py-2 border-b border-white/5"
            >
              Developers
            </a>
            {walletAddress ? (
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAccountModalOpen(true);
                }}
                className="w-full text-center py-3 mt-2 rounded-full text-sm font-semibold text-white bg-white/5 border border-white/10 flex items-center justify-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brandLime animate-pulse" />
                <span className="font-mono">{walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</span>
              </button>
            ) : (
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsConnectModalOpen(true);
                }}
                className="w-full text-center py-3 mt-2 rounded-full text-sm font-semibold text-brandDark bg-brandLime shadow-[0_0_15px_rgba(212,255,63,0.2)]"
              >
                Connect Wallet
              </button>
            )}
          </div>
        )}
      </header>

      {/* Full-width elegant horizontal stripes behind Hero */}
      <div className="absolute inset-x-0 top-20 h-[750px] pointer-events-none overflow-hidden z-0 select-none">
        {/* Horizontal stripes (off-white grid lines) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:100%_64px]" />
        {/* Subtle vertical grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:96px_100%]" />
        {/* Fade gradient masks to blend cleanly */}
        <div className="absolute inset-0 bg-gradient-to-b from-brandDark via-transparent to-brandDark" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#000000_95%)]" />
      </div>

      {/* Hero Section - Asymmetric Split Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24 md:pt-20 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Column: Hero Text (Displays Right on desktop, Top on mobile) */}
          <div className="lg:col-span-6 flex flex-col items-start text-left z-10 lg:order-2">
            {/* Subtle Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brandPurple/20 bg-brandPurpleDark/40 text-xs font-semibold uppercase tracking-wider text-brandPurple shadow-sm glow-purple mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brandLime animate-pulse" />
              Soroban Smart Contracts
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
              Shared Liquidity. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-brandLime">Engineered for Stellar.</span>
            </h1>

            {/* Description */}
            <p className="max-w-xl text-base sm:text-lg md:text-xl text-brandGray leading-relaxed mb-8">
              Ergo Protocol brings next-generation capital efficiency to Stellar. Supply, borrow, and leverage assets with a robust shared core, fallback oracle aggregators, and compliance modularity.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10 w-full sm:w-auto">
              <a 
                href="#launch" 
                className="px-8 py-4 rounded-full text-sm font-semibold tracking-wider text-brandDark bg-brandLime shadow-[0_0_20px_rgba(212,255,63,0.25)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(212,255,63,0.4)] text-center"
              >
                Try it now
              </a>
              <a 
                href="#docs" 
                className="px-8 py-4 rounded-full text-sm font-semibold tracking-wider text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 text-center"
              >
                Explore Docs
              </a>
            </div>

            {/* Core Stats under Hero Text */}
            <div className="flex gap-8 border-t border-white/5 pt-8 w-full max-w-lg">
              <div>
                <p className="text-xs text-brandGray/60 uppercase tracking-widest">Protocol TVL</p>
                <p className="text-xl font-bold text-white mt-1">$48.6M+</p>
              </div>
              <div>
                <p className="text-xs text-brandGray/60 uppercase tracking-widest">Oracle Security</p>
                <p className="text-xl font-bold text-white mt-1">Multi-Feed</p>
              </div>
              <div>
                <p className="text-xs text-brandGray/60 uppercase tracking-widest">Liquidity Architecture</p>
                <p className="text-xl font-bold text-brandLime mt-1">Shared Core</p>
              </div>
            </div>
          </div>

          {/* Column: Original Image + CSS filter, Frame-Free & Enlarged (Displays Left on desktop, Bottom on mobile) */}
          <div className="lg:col-span-6 flex justify-center items-center w-full relative z-0 mt-8 lg:mt-0 lg:order-1">
            {/* Ambient green glow behind the image */}
            <div className="absolute inset-0 bg-brandLime/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="relative w-full max-w-[620px] aspect-[586/676] select-none">
              {/* The exact image with CSS filter to shift purple to neon green */}
              <img 
                src="/concept-isometric.png" 
                alt="Ergo Protocol Concept Illustration" 
                className="w-full h-full object-contain filter hue-rotate-[170deg] saturate-[2.5] brightness-[1.1] contrast-[1.05]"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Info Split Section & Features Grid */}
      <section id="about" className="relative z-10 border-t border-white/5 bg-black/20 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Headline Split layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start mb-20 md:mb-28">
            <div className="lg:col-span-7">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brandLime">Architecture Context</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight mt-3">
                Engineered to solve liquidity fragmentation on Stellar.
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pt-4 flex flex-col items-start gap-6">
              <p className="text-base sm:text-lg text-brandGray leading-relaxed">
                Unlike traditional lending systems that isolate funds across separate pools, Ergo Protocol runs a hybrid **Shared Liquidity Core + Isolated Satellite Pools** framework. This secures ultimate capital efficiency and cross-pool routing safety.
              </p>
              <a 
                href="#learn-more" 
                className="inline-flex items-center gap-2 text-sm font-semibold text-brandLime group"
              >
                Read our Technical Spec 
                <svg 
                  className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          {/* Three Feature Cards Section - All uniform glassmorphic */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Card 1: Standard Glass Card */}
            <div className="glass-panel glass-panel-hover rounded-[2rem] p-8 flex flex-col justify-between min-h-[340px]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brandLime/10 border border-brandLime/20 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-brandLime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Capital that grows</h3>
                <p className="text-sm sm:text-base text-brandGray leading-relaxed">
                  Earn passive yields natively on Stellar as your assets deploy dynamically across low-risk market-making pools.
                </p>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-6">
                <div className="w-1/3 h-full bg-brandLime" />
              </div>
            </div>

            {/* Card 2: Glass Card */}
            <div className="glass-panel glass-panel-hover rounded-[2rem] p-8 flex flex-col justify-between min-h-[340px]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brandPurple/10 border border-brandPurple/20 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-brandPurple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Liquid and flexible</h3>
                <p className="text-sm sm:text-base text-brandGray leading-relaxed">
                  Stay fully liquid with instant entry and exit options. Withdraw, transfer, or leverage your assets without lockups or hidden delays.
                </p>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-6">
                <div className="w-2/3 h-full bg-brandPurple" />
              </div>
            </div>

            {/* Card 3: Glass Card */}
            <div className="glass-panel glass-panel-hover rounded-[2rem] p-8 flex flex-col justify-between min-h-[340px]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">100% hands-free</h3>
                <p className="text-sm sm:text-base text-brandGray leading-relaxed">
                  No complex monitoring required. The automated algorithms handle security rebalancing and optimization parameters under the hood.
                </p>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-6">
                <div className="w-full h-full bg-brandLime" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Partners / Backers Row */}
      <section className="border-y border-white/5 bg-brandDark py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-brandGray/60 mb-8">
            Supported Ecosystem integrations & technologies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-60">
            <div className="flex items-center gap-2 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
              <span className="font-extrabold text-lg text-white tracking-widest">STELLAR</span>
              <span className="w-1.5 h-1.5 rounded-full bg-brandLime" />
            </div>
            <div className="flex items-center gap-2 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
              <span className="font-extrabold text-lg text-white tracking-widest">SOROBAN</span>
              <span className="w-1.5 h-1.5 rounded-full bg-brandPurple" />
            </div>
            <div className="flex items-center gap-2 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
              <span className="font-extrabold text-lg text-white tracking-widest">DECIMAL</span>
            </div>
            <div className="flex items-center gap-2 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
              <span className="font-extrabold text-lg text-white tracking-widest">NEXUS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-brandLime" />
            </div>
            <div className="flex items-center gap-2 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
              <span className="font-extrabold text-lg text-white tracking-widest">LUMENS</span>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Risk Dashboard (City Buildings Hero Image) Section - Horizontal Widescreen Banner */}
      <section id="dashboard" className="relative z-10 py-12 bg-black overflow-hidden">
        {/* Full-bleed horizontal banner with high visibility of the city buildings visual */}
        <div className="w-full relative min-h-[320px] sm:min-h-[420px] md:min-h-[500px] overflow-hidden flex items-center justify-center border-y border-white/5 bg-brandDark">
          {/* Background image container - fully visible layout */}
          <div className="absolute inset-0 z-0 select-none">
            <img 
              src="/hero-visual.png" 
              alt="Risk Dashboard Visual" 
              className="w-full h-full object-cover object-center opacity-90 filter brightness-[0.95] contrast-[1.02]"
            />
            {/* Elegant fade gradients to blend the widescreen edges to pure black */}
            <div className="absolute inset-y-0 left-0 w-24 sm:w-48 bg-gradient-to-r from-brandDark to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-24 sm:w-48 bg-gradient-to-l from-brandDark to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-brandDark to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brandDark to-transparent pointer-events-none" />
          </div>

          {/* Text Content inside glassmorphic overlay for maximum readability & premium blend */}
          <div className="max-w-4xl mx-auto px-6 relative z-10 py-8">
            <div className="glass-panel backdrop-blur-md bg-black/60 border border-white/10 rounded-[2rem] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brandLime">Real-time Risk Management</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight mt-3">
                Institutional-grade Oracles & Dutch Liquidations.
              </h2>
              <p className="text-base sm:text-lg text-brandGray mt-4 max-w-2xl mx-auto leading-relaxed">
                Monitor active positions, check price aggregator safety status, and watch liquidation auctions occur transparently. Our multi-source aggregator queries Reflector & DEX TWAPs with staleness limits and deviation circuit breakers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="relative z-10 py-24 md:py-32 bg-black/10">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center md:text-left max-w-3xl mb-16">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brandPurple">Ergo in Action</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight mt-3">
              Use cases built for modern finance.
            </h2>
            <p className="text-base sm:text-lg text-brandGray mt-4">
              Explore how Ergo Protocol transforms financial interactions for developers, businesses, and treasury managers alike.
            </p>
          </div>

          {/* Use Cases Layout matching BloomFi structure */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Business Case (2/3 width on desktop) */}
            <div className="lg:col-span-7 relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-brandCardBg flex flex-col justify-between group shadow-xl min-h-[450px] hover:border-brandLime/20 transition-all duration-300">
              {/* Backing Image covering bottom-right with hover drift animation */}
              <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <img 
                  src="/use-case-bg-1.png" 
                  alt="Business abstract curves" 
                  className="absolute bottom-0 right-0 w-2/3 h-full object-cover object-right transform scale-100 group-hover:scale-108 group-hover:translate-x-2 group-hover:-translate-y-2 group-hover:rotate-1 transition-transform duration-700 brightness-[0.55] opacity-[0.4] mix-blend-lighten"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-brandCardBg via-brandCardBg/85 to-transparent" />
              </div>

              {/* Top Text Content */}
              <div className="p-8 sm:p-12 relative z-10 max-w-lg">
                <span className="text-xs font-bold uppercase tracking-wider text-brandLime">01 / Businesses</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mt-4 mb-4">Enterprise Yield Integration</h3>
                <p className="text-sm sm:text-base text-brandGray leading-relaxed">
                  Boost platform engagement by offering Ergo savings yields. Programmatically embed high-yield pools into customer balance sheets using our Stellar Soroban smart contracts.
                </p>
              </div>

              {/* Learn More link at the bottom */}
              <div className="p-8 sm:p-12 pt-0 relative z-10">
                <a 
                  href="#business-details" 
                  className="inline-flex items-center gap-2.5 text-sm font-semibold text-white group"
                >
                  Learn more 
                  <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors duration-200">
                    <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </a>
              </div>
            </div>

            {/* Treasury Case (1/3 width on desktop) */}
            <div className="lg:col-span-5 relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-brandCardBg flex flex-col justify-between group shadow-xl min-h-[450px] hover:border-brandPurple/20 transition-all duration-300">
              {/* Backing Image covering bottom-right with hover drift animation */}
              <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <img 
                  src="/use-case-bg-2.png" 
                  alt="Treasury abstract waves" 
                  className="absolute bottom-0 right-0 w-full h-full object-cover object-bottom-right transform scale-100 group-hover:scale-110 group-hover:-translate-x-2 group-hover:translate-y-2 group-hover:-rotate-1 transition-transform duration-700 brightness-[0.5] opacity-[0.4] mix-blend-lighten"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-brandCardBg via-brandCardBg/85 to-transparent" />
              </div>

              {/* Top Text Content */}
              <div className="p-8 sm:p-12 relative z-10 max-w-md">
                <span className="text-xs font-bold uppercase tracking-wider text-brandPurple">02 / Treasuries</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mt-4 mb-4">Capital Optimization</h3>
                <p className="text-sm sm:text-base text-brandGray leading-relaxed">
                  Avoid idle balances. Put corporate treasury cash to work automatically inside liquid and heavily collateralized money markets, keeping funds ready for immediate business deployment.
                </p>
              </div>

              {/* Learn More link at the bottom */}
              <div className="p-8 sm:p-12 pt-0 relative z-10">
                <a 
                  href="#treasury-details" 
                  className="inline-flex items-center gap-2.5 text-sm font-semibold text-white group"
                >
                  Learn more 
                  <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors duration-200">
                    <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </a>
              </div>
            </div>

            {/* Developers Case (Full width banner) */}
            <div className="lg:col-span-12 relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-brandCardBg p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-xl group hover:border-brandLime/20 transition-all duration-300 min-h-[220px]">
              {/* Backing Image covering bottom-right with hover drift animation */}
              <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <img 
                  src="/use-case-bg-1.png" 
                  alt="Compliance abstract curves" 
                  className="absolute bottom-0 right-0 w-[55%] h-full object-cover object-right transform scale-100 group-hover:scale-108 group-hover:translate-x-3 group-hover:translate-y-2 group-hover:rotate-1 transition-transform duration-700 brightness-[0.45] opacity-[0.35] mix-blend-lighten filter hue-rotate-[180deg]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-brandCardBg via-brandCardBg/80 to-transparent" />
              </div>

              {/* Text Content */}
              <div className="max-w-2xl relative z-10">
                <span className="text-xs font-bold uppercase tracking-wider text-white">03 / Compliance & RWA Layer</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mt-4 mb-4">Native Compliance Modules</h3>
                <p className="text-sm sm:text-base text-brandGray leading-relaxed">
                  Ergo features a thin, auditable compliance contract. Integrate with Stellar's native authorization flags and clawback primitives directly, making permissioned institutional lending possible.
                </p>
              </div>

              {/* Action Button */}
              <div className="flex-shrink-0 relative z-10">
                <a 
                  href="#dev-details" 
                  className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full text-sm font-semibold text-brandDark bg-brandLime group hover:opacity-95 shadow-[0_0_15px_rgba(212,255,63,0.15)] transition-all"
                >
                  Developer Hub
                  <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Developer Section Panel with glowing code mock */}
      <section id="developers" className="relative z-10 py-24 md:py-32 border-t border-white/5 bg-brandDark">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          <div className="lg:col-span-5">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brandLime">Built for Builders</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight mt-3">
              Developer-first architecture.
            </h2>
            <p className="text-base sm:text-lg text-brandGray mt-6 leading-relaxed">
              Integrate Ergo in minutes. We provide robust SDKs, type-safe Soroban bindings, and a fully documented REST API to orchestrate transactions and manage user assets cleanly.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#github" className="px-6 py-3 rounded-full border border-white/10 hover:bg-white/5 text-sm font-semibold text-white transition-all flex items-center gap-2">
                <span>View GitHub</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brandLime" />
              </a>
              <a href="#testnet" className="px-6 py-3 rounded-full text-sm font-semibold text-brandGray hover:text-white transition-all">
                Testnet Sandbox
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            {/* Elegant glowing Code Box */}
            <div className="w-full rounded-2xl border border-white/5 bg-black/60 p-1.5 overflow-hidden shadow-2xl relative">
              {/* Fake window controls */}
              <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="text-xs text-brandGray/60 ml-4 font-mono font-medium">ergo_lending_demo.ts</span>
              </div>
              <pre className="p-6 text-xs sm:text-sm font-mono overflow-x-auto text-brandGray leading-relaxed">
                <code>
<span className="text-brandPurple">import</span> &#123; ErgoClient, Network &#125; <span className="text-brandPurple">from</span> <span className="text-brandLime">"@ergo-protocol/sdk"</span>;<br /><br />
<span className="text-brandGray/50">// Initialize Ergo SDK for Stellar Mainnet</span><br />
<span className="text-brandPurple">const</span> ergo = <span className="text-brandPurple">new</span> <span className="text-white">ErgoClient</span>(&#123;<br />
&nbsp;&nbsp;network: Network.MAINNET,<br />
&nbsp;&nbsp;rpcUrl: <span className="text-brandLime">"https://soroban-rpc.stellar.org"</span><br />
&#125;);<br /><br />
<span className="text-brandGray/50">// Deposit USDB stablecoins into the lending pool</span><br />
<span className="text-brandPurple">const</span> receipt = <span className="text-brandPurple">await</span> ergo.<span className="text-white">deposit</span>(&#123;<br />
&nbsp;&nbsp;assetCode: <span className="text-brandLime">"USDB"</span>,<br />
&nbsp;&nbsp;amount: <span className="text-brandLime">"15000.00"</span>,<br />
&nbsp;&nbsp;signer: myStellarWalletSignature<br />
&#125;);<br /><br />
<span className="text-brandPurple">console</span>.<span className="text-white">log</span>(<span className="text-brandLime">`Deposited successfully. APY: $&#123;receipt.apy&#125;%`</span>);
                </code>
              </pre>
            </div>
          </div>

        </div>
      </section>

      {/* Final Launch Callout Panel */}
      <section id="launch" className="relative z-10 py-24 md:py-32 bg-gradient-to-t from-brandPurpleDark/20 to-transparent">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-[3rem] border border-brandPurple/20 bg-brandCardBg/60 p-8 sm:p-16 text-center relative overflow-hidden shadow-2xl glow-purple">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brandPurple/5 to-transparent pointer-events-none" />
            
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brandLime">Experience Ergo</span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-4 mb-6 leading-tight">
              Ready to amplify your <br />Stellar assets?
            </h2>
            <p className="max-w-xl mx-auto text-base sm:text-lg text-brandGray mb-10 leading-relaxed">
              Launch the application on Testnet or Mainnet. Connect your Stellar wallet and configure your lending parameters in seconds.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto">
              <a href="#testnet" className="w-full sm:w-52 py-4 rounded-full text-sm font-semibold tracking-wider text-brandDark bg-brandLime shadow-[0_0_20px_rgba(212,255,63,0.2)] hover:scale-[1.02] transition-transform text-center">
                Launch Mainnet
              </a>
              <a href="#mainnet" className="w-full sm:w-52 py-4 rounded-full text-sm font-semibold tracking-wider text-white border border-white/10 hover:bg-white/5 transition-colors text-center">
                Access Testnet
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with background holographic stream */}
      <footer id="docs" className="relative z-10 border-t border-white/5 bg-black/85 pt-20 pb-10 overflow-hidden">
        {/* Background flow-bg-1.png */}
        <div className="absolute inset-0 z-0 opacity-[0.18] pointer-events-none mix-blend-screen select-none">
          <img 
            src="/flow-bg-1.png" 
            alt="Holographic flow background" 
            className="w-full h-full object-cover blur-sm rotate-180 scale-y-[-1]"
          />
          {/* Subtle overlay gradient to ensure high readability of text */}
          <div className="absolute inset-0 bg-gradient-to-b from-brandDark via-transparent to-brandDark" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-10 md:gap-8 pb-16 border-b border-white/5">
            {/* Logo/Info Col */}
            <div className="col-span-2 flex flex-col items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-brandLime">
                  <img src="/logo.png" alt="Ergo Logo" className="w-full h-full object-cover scale-110" />
                </div>
                <span className="font-sans font-bold text-base tracking-tight text-white">ergo protocol</span>
              </div>
              <p className="text-xs sm:text-sm text-brandGray leading-relaxed mt-2 max-w-xs">
                A resilient, compliance-ready lending infrastructure for the Stellar network. Build, supply, and borrow decentralized capital with ease.
              </p>
            </div>

            {/* Links Col 1 */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Product</h4>
              <ul className="flex flex-col gap-2.5 text-xs sm:text-sm text-brandGray">
                <li><a href="#lend" className="hover:text-white transition-colors">Supply</a></li>
                <li><a href="#borrow" className="hover:text-white transition-colors">Borrow</a></li>
                <li><a href="#staking" className="hover:text-white transition-colors">Stake</a></li>
                <li><a href="#gov" className="hover:text-white transition-colors">Governance</a></li>
              </ul>
            </div>

            {/* Links Col 2 */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Developers</h4>
              <ul className="flex flex-col gap-2.5 text-xs sm:text-sm text-brandGray">
                <li><a href="#docs" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#github" className="hover:text-white transition-colors">GitHub Repository</a></li>
                <li><a href="#audit" className="hover:text-white transition-colors">Security Audit</a></li>
                <li><a href="#sdk" className="hover:text-white transition-colors">Protocol SDKs</a></li>
              </ul>
            </div>

            {/* Links Col 3 */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Resources</h4>
              <ul className="flex flex-col gap-2.5 text-xs sm:text-sm text-brandGray">
                <li><a href="#blog" className="hover:text-white transition-colors">Ecosystem Blog</a></li>
                <li><a href="#whitepaper" className="hover:text-white transition-colors">Whitepaper</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Help & FAQ</a></li>
                <li><a href="#status" className="hover:text-white transition-colors">Network Status</a></li>
              </ul>
            </div>

            {/* Links Col 4 */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Company</h4>
              <ul className="flex flex-col gap-2.5 text-xs sm:text-sm text-brandGray">
                <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#brand" className="hover:text-white transition-colors">Brand Assets</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact Press</a></li>
              </ul>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-brandGray/60">
            <p>© {new Date().getFullYear()} Ergo Protocol. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>

        </div>
      </footer>

      {/* Wallet Connection Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#0d0c14] overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[420px] max-h-[90vh]">
            {/* Close Button */}
            <button 
              onClick={() => {
                setIsConnectModalOpen(false);
                setConnectionError(null);
              }}
              className="absolute top-5 right-5 text-brandGray hover:text-white transition-colors z-20"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Left Column: List of wallets */}
            <div className="w-full md:w-[40%] border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col gap-3 justify-center bg-black/30">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Connect a Wallet</h3>
              
              {/* Freighter Wallet */}
              <button 
                onClick={() => {
                  setSelectedWalletForDetails("freighter");
                  setConnectionError(null);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedWalletForDetails === "freighter" ? "border-brandLime bg-brandLime/10 text-white" : "border-white/5 hover:border-white/10 bg-white/5 text-brandGray hover:text-white"}`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#1c1538] flex items-center justify-center flex-shrink-0 text-brandLime font-bold text-sm">
                  FR
                </div>
                <div>
                  <p className="text-sm font-bold">Freighter</p>
                  <p className="text-[10px] opacity-60">Stellar Extension</p>
                </div>
              </button>

              {/* Albedo Wallet */}
              <button 
                onClick={() => {
                  setSelectedWalletForDetails("albedo");
                  setConnectionError(null);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedWalletForDetails === "albedo" ? "border-brandLime bg-brandLime/10 text-white" : "border-white/5 hover:border-white/10 bg-white/5 text-brandGray hover:text-white"}`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center flex-shrink-0 text-brandPurple font-bold text-sm">
                  AL
                </div>
                <div>
                  <p className="text-sm font-bold">Albedo</p>
                  <p className="text-[10px] opacity-60">Browser Link / Ext</p>
                </div>
              </button>

              {/* Demo Wallet */}
              <button 
                onClick={() => {
                  setSelectedWalletForDetails("demo");
                  setConnectionError(null);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedWalletForDetails === "demo" ? "border-brandLime bg-brandLime/10 text-white" : "border-white/5 hover:border-white/10 bg-white/5 text-brandGray hover:text-white"}`}
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                  DM
                </div>
                <div>
                  <p className="text-sm font-bold">Demo Wallet</p>
                  <p className="text-[10px] opacity-60">Simulate Connection</p>
                </div>
              </button>
            </div>

            {/* Right Column: Actions Panel */}
            <div className="w-full md:w-[60%] p-8 flex flex-col justify-between bg-black/10">
              <div>
                {selectedWalletForDetails === "freighter" && (
                  <div className="flex flex-col gap-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-brandLime" />
                      Freighter Wallet
                    </h4>
                    <p className="text-sm text-brandGray leading-relaxed">
                      Connect using the official Stellar browser extension. Ensure the extension is installed and unlocked.
                    </p>
                    <button 
                      onClick={connectFreighter}
                      disabled={isConnecting}
                      className="mt-4 px-6 py-3 rounded-xl bg-brandLime hover:bg-brandLime/90 text-brandDark font-semibold text-sm transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(212,255,63,0.15)] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isConnecting ? "Connecting..." : "Request Access Key"}
                    </button>
                  </div>
                )}

                {selectedWalletForDetails === "albedo" && (
                  <div className="flex flex-col gap-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-brandPurple" />
                      Albedo Wallet
                    </h4>
                    <p className="text-sm text-brandGray leading-relaxed">
                      Albedo provides a secure browser link overlay. Works on mobile and desktop without requiring extensions.
                    </p>
                    <button 
                      onClick={connectAlbedo}
                      disabled={isConnecting}
                      className="mt-4 px-6 py-3 rounded-xl bg-brandLime hover:bg-brandLime/90 text-brandDark font-semibold text-sm transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(212,255,63,0.15)] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isConnecting ? "Connecting..." : "Connect via Albedo Link"}
                    </button>
                  </div>
                )}

                {selectedWalletForDetails === "demo" && (
                  <div className="flex flex-col gap-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white" />
                      Simulate Wallet Connection
                    </h4>
                    <p className="text-sm text-brandGray leading-relaxed">
                      Quickly preview all connected features, dynamic dashboard values, and personalized UI elements of the Ergo Protocol landing page.
                    </p>
                    <button 
                      onClick={connectDemoWallet}
                      disabled={isConnecting}
                      className="mt-4 px-6 py-3 rounded-xl bg-brandLime hover:bg-brandLime/90 text-brandDark font-semibold text-sm transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(212,255,63,0.15)] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isConnecting ? "Connecting..." : "Simulate Connection"}
                    </button>
                  </div>
                )}

                {!selectedWalletForDetails && (
                  <div className="flex flex-col items-center justify-center text-center h-[240px] gap-3">
                    <svg className="w-10 h-10 text-brandGray/40 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <p className="text-sm text-brandGray">Select a wallet on the left to initiate connection.</p>
                  </div>
                )}

                {connectionError && (
                  <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                    {connectionError}
                  </div>
                )}
              </div>

              <div className="text-xs text-brandGray/50 border-t border-white/5 pt-4 mt-6">
                By connecting, you agree to the Terms of Service & Privacy Policy.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connected Account Details Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0d0c14] p-6 shadow-2xl flex flex-col gap-6">
            {/* Close Button */}
            <button 
              onClick={() => setIsAccountModalOpen(false)}
              className="absolute top-5 right-5 text-brandGray hover:text-white transition-colors"
              aria-label="Close details"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brandLime animate-pulse" />
                Connected Wallet
              </h3>
              <p className="text-xs text-brandGray mt-1">Provider: <span className="text-white font-semibold">{walletProvider}</span></p>
            </div>

            <div className="bg-black/40 rounded-2xl border border-white/5 p-4 flex flex-col gap-3">
              <p className="text-xs text-brandGray/60 font-mono">Public Address</p>
              <p className="text-sm text-white font-mono break-all leading-relaxed select-all bg-white/5 p-3 rounded-lg border border-white/5">
                {walletAddress}
              </p>
              
              <button 
                onClick={() => {
                  if (walletAddress) {
                    navigator.clipboard.writeText(walletAddress);
                    const btn = document.getElementById("copy-btn-txt");
                    if (btn) {
                      btn.textContent = "Copied Address!";
                      setTimeout(() => {
                        if (btn) btn.textContent = "Copy Full Address";
                      }, 2000);
                    }
                  }
                }}
                className="w-full py-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span id="copy-btn-txt">Copy Full Address</span>
              </button>
            </div>

            <button 
              onClick={disconnectWallet}
              className="w-full py-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold uppercase tracking-wider text-red-400 transition-all"
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}

    </div>
  );
}