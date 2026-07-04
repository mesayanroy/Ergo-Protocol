"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Horizon, Networks, TransactionBuilder, Operation, Asset } from "@stellar/stellar-sdk";

export interface WalletInfo {
  id: string;
  name: string;
  type: "extension" | "web" | "mobile" | "demo";
  description: string;
  installUrl?: string;
  isInstalled: boolean;
}

interface StellarWalletContextType {
  walletAddress: string | null;
  walletProvider: string | null;
  isConnecting: boolean;
  connectionError: string | null;
  connectWallet: (id: string) => Promise<boolean>;
  disconnect: () => void;
  isWalletInstalled: (id: string) => boolean;
  signTransaction: (xdr: string) => Promise<string>;
  addTrustline: (assetCode: string, contractId: string) => Promise<string>;
}

const StellarWalletContext = createContext<StellarWalletContextType | undefined>(undefined);

export const StellarWalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Auto reconnect on page refresh
  useEffect(() => {
    const cachedProvider = localStorage.getItem("ergo_wallet_provider");
    const cachedAddress = localStorage.getItem("ergo_wallet_address");
    
    if (cachedProvider && cachedAddress) {
      setWalletAddress(cachedAddress);
      setWalletProvider(cachedProvider);
    }
  }, []);

  const isWalletInstalled = (id: string): boolean => {
    if (typeof window === "undefined") return false;
    switch (id) {
      case "freighter":
        return true; // Bypasses timing issues: always allow attempting Freighter connection
      case "xbull":
        return !!(window as any).xBullSDK;
      case "hana":
        return !!(window as any).hanaWallet;
      case "albedo":
      case "lobstr":
      case "demo":
        return true; // Web-based, mobile or demo sandbox
      default:
        return false;
    }
  };

  const connectWallet = async (id: string): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionError(null);
    try {


      if (id === "freighter") {
        let address = "";
        if (typeof window !== "undefined" && ((window as any).stellarKeeper || (window as any).freighter)) {
          try {
            const keeper = (window as any).stellarKeeper || (window as any).freighter;
            address = await keeper.requestAccess();
          } catch (err: any) {
            throw new Error(err.message || "Freighter rejected connection access.");
          }
        } else {
          const freighter = await import("@stellar/freighter-api");
          let hasFreighter = false;
          try {
            const status = await freighter.isConnected() as any;
            hasFreighter = typeof status === "boolean" ? status : !!status?.isConnected;
          } catch (e) {
            hasFreighter = true; // Bypasses timing checks
          }
          
          if (!hasFreighter) {
            throw new Error("Freighter extension not detected. Please make sure the browser extension is enabled and unlocked.");
          }
          
          try {
            const res = await freighter.requestAccess() as any;
            address = typeof res === "string" ? res : res?.address || "";
          } catch (err: any) {
            throw new Error(err.message || "Freighter access request denied.");
          }
        }

        if (!address) {
          throw new Error("No address returned from Freighter wallet connection.");
        }
        
        setWalletAddress(address);
        setWalletProvider("Freighter");
        localStorage.setItem("ergo_wallet_provider", "Freighter");
        localStorage.setItem("ergo_wallet_address", address);
        return true;
      }

      if (id === "albedo") {
        const albedo = (await import("@albedo-link/intent")).default;
        const response = await albedo.publicKey({});
        if (!response || !response.pubkey) {
          throw new Error("User rejected Albedo connection.");
        }
        setWalletAddress(response.pubkey);
        setWalletProvider("Albedo");
        localStorage.setItem("ergo_wallet_provider", "Albedo");
        localStorage.setItem("ergo_wallet_address", response.pubkey);
        return true;
      }

      if (id === "demo") {
        // Mock connection session for local developers and sandbox testing
        await new Promise((resolve) => setTimeout(resolve, 800));
        const demoAddress = "GBDEMO7777777777777777777777777777777777777777777777ERGO";
        setWalletAddress(demoAddress);
        setWalletProvider("Demo Wallet");
        localStorage.setItem("ergo_wallet_provider", "Demo Wallet");
        localStorage.setItem("ergo_wallet_address", demoAddress);
        return true;
      }

      if (id === "xbull") {
        const xbull = (window as any).xBullSDK;
        if (!xbull) {
          throw new Error("xBull Wallet extension not detected.");
        }
        const keys = await xbull.getPublicKey();
        if (!keys || keys.length === 0) {
          throw new Error("Could not fetch address from xBull.");
        }
        setWalletAddress(keys[0]);
        setWalletProvider("xBull");
        localStorage.setItem("ergo_wallet_provider", "xBull");
        localStorage.setItem("ergo_wallet_address", keys[0]);
        return true;
      }

      if (id === "hana") {
        const hana = (window as any).hanaWallet;
        if (!hana) {
          throw new Error("Hana Wallet extension not detected.");
        }
        const keys = await hana.stellar.requestAccounts();
        if (!keys || keys.length === 0) {
          throw new Error("Could not fetch address from Hana.");
        }
        setWalletAddress(keys[0]);
        setWalletProvider("Hana");
        localStorage.setItem("ergo_wallet_provider", "Hana");
        localStorage.setItem("ergo_wallet_address", keys[0]);
        return true;
      }

      if (id === "lobstr") {
        // LOBSTR mobile simulated link
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const lobstrAddress = "GBLOBSTR88888888888888888888888888888888888888888888LOBSTR";
        setWalletAddress(lobstrAddress);
        setWalletProvider("LOBSTR");
        localStorage.setItem("ergo_wallet_provider", "LOBSTR");
        localStorage.setItem("ergo_wallet_address", lobstrAddress);
        return true;
      }

      throw new Error(`Unsupported wallet provider: ${id}`);
    } catch (err: any) {
      setConnectionError(err.message || `Failed to connect ${id}`);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setWalletAddress(null);
    setWalletProvider(null);
    localStorage.removeItem("ergo_wallet_provider");
    localStorage.removeItem("ergo_wallet_address");
  };

  const signTransaction = async (xdr: string): Promise<string> => {
    if (!walletProvider) throw new Error("Wallet not connected");
    const providerId = walletProvider.toLowerCase();
    
    if (providerId === "freighter") {
      const freighter = await import("@stellar/freighter-api");
      const res = await freighter.signTransaction(xdr, { networkPassphrase: 'Test SDF Network ; September 2015' } as any) as any;
      return res.signedTxXdr || res;
    }
    
    if (providerId === "albedo") {
      const albedo = (await import("@albedo-link/intent")).default;
      const res = await albedo.tx({ xdr });
      return res.signed_envelope_xdr;
    }

    if (providerId === "xbull") {
      const xbull = (window as any).xBullSDK;
      return await xbull.signTransaction(xdr);
    }
    
    if (providerId === "demo wallet") {
      return xdr;
    }

    throw new Error(`Transaction signing not supported for provider: ${walletProvider}`);
  };

  // Add trustline for contract‑based assets
  const addTrustline = async (assetCode: string, contractId: string): Promise<string> => {
    if (!walletAddress) throw new Error('Wallet not connected');
    const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
    const account = await horizon.loadAccount(walletAddress);
    const asset = new Asset(assetCode, contractId);
    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.changeTrust({ asset }))
      .setTimeout(30)
      .build();
    // Sign using existing provider method
    const xdr = tx.toXDR();
    const signedXdr = await signTransaction(xdr);
    const result = await horizon.submitTransaction(TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET));
    return result.hash;
  };

  return (
    <StellarWalletContext.Provider
      value={{
        walletAddress,
        walletProvider,
        isConnecting,
        connectionError,
        connectWallet,
        disconnect,
        isWalletInstalled,
        signTransaction,
        addTrustline,
      }}
    >
      {children}
    </StellarWalletContext.Provider>
  );
};

export const useStellarWallet = () => {
  const context = useContext(StellarWalletContext);
  if (!context) {
    throw new Error("useStellarWallet must be used inside a StellarWalletProvider");
  }
  return context;
};
