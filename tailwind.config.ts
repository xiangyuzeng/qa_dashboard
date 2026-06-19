import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Mirrors the workbook's risk palette so UI and Excel stay visually aligned.
        risk: {
          high: "#C00000", // 高风险 — matches template high-risk font color
          highbg: "#F4CCCC", // matches template high-risk fill
          med: "#B45309",
          low: "#15803D",
          info: "#475569",
        },
        brandnavy: "#1F4E79", // template header navy
      },
    },
  },
  plugins: [],
} satisfies Config;
