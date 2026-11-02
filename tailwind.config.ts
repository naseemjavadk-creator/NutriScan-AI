import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FBFAF5",
        ink: "#15231B",
        muted: "#5B685F",
        line: "#E4E8DE",
        leaf: {
          50: "#F0F8F2",
          100: "#DCEFE1",
          200: "#BFE0C8",
          500: "#2F9E5B",
          600: "#238049",
          700: "#1B673B",
        },
        protein: "#2F9E5B",
        carbs: "#E3A21A",
        fat: "#E2694F",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(21,35,27,0.04), 0 10px 28px -14px rgba(21,35,27,0.16)",
      },
    },
  },
  plugins: [],
};
export default config;
