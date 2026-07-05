import type { ReactNode } from "react";
import { Instrument_Sans, Instrument_Serif, Outfit } from "next/font/google";
import { StellarWalletProvider } from "../lib/stellar-wallet";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument-serif",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${instrumentSerif.variable} ${outfit.variable}`}>
      <body>
        <StellarWalletProvider>
          {children}
        </StellarWalletProvider>
      </body>
    </html>
  );
}