import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#f5f5f2",
        accent: "#7c3aed",
        accentSecondary: "#d4ff3f",
        brandDark: "#000000",
        brandLime: "#d4ff3f",
        brandPurple: "#7c3aed",
        brandPurpleDark: "#1c1538",
        brandGray: "#94a3b8",
        brandCardBg: "#0d0c14",
      },
      fontFamily: {
        sans: ["var(--font-instrument-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;