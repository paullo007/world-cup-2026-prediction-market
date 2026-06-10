import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Apple-style light surfaces
        surface: {
          DEFAULT: "#ffffff",
          raised: "#f5f5f7",
          hover: "#ececef",
          border: "#d2d2d7",
        },
        yes: {
          DEFAULT: "#16a34a",
          dim: "#dcfce7",
        },
        no: {
          DEFAULT: "#dc2626",
          dim: "#fee2e2",
        },
        accent: {
          DEFAULT: "#0071e3",
          hover: "#0077ed",
        },
        // Remap the slate ramp to Apple greys so muted text reads on white.
        // Lower number = more prominent (darker); higher = more muted (lighter).
        slate: {
          100: "#1d1d1f",
          200: "#1d1d1f",
          300: "#515154",
          400: "#6e6e73",
          500: "#86868b",
          600: "#6e6e73",
          900: "#1d1d1f",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
