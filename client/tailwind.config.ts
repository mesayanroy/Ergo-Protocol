import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        foreground: "#f5f5f2",
        accent: "#7c3aed",
        accentSecondary: "#d4ff3f",
      },
    },
  },
  plugins: [],
};

export default config;