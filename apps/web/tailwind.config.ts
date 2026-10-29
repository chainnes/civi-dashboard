import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canopy: {
          50: "#e8f6ee",
          400: "#3dba7a",
          500: "#1f8a54",
          700: "#0f4d34",
          900: "#06281c",
        },
        gold: {
          200: "#f0d9a0",
          400: "#d4a84b",
        },
        neon: {
          400: "#6ee7c5",
        },
        loam: {
          800: "#121a16",
          900: "#0b100e",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(110, 231, 197, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
