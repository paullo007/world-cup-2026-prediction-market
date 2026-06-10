import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0e1420",
          raised: "#161e2e",
          hover: "#1c2738",
          border: "#243047",
        },
        yes: {
          DEFAULT: "#22c55e",
          dim: "#14532d",
        },
        no: {
          DEFAULT: "#ef4444",
          dim: "#7f1d1d",
        },
        accent: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
