import type { ReactNode } from "react";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${instrumentSerif.variable}`}>
      <body>
        <StellarWalletProvider>
          {children}
        </StellarWalletProvider>
      </body>
    </html>
  );
}