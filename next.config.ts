import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Excel export route reads templates/monthly_report.xlsx at request time.
  // Pattern B (new URL(..., import.meta.url)) is primary in the route; this is the
  // belt-and-suspenders Pattern A so @vercel/nft always traces the binary into the
  // serverless function bundle.
  outputFileTracingIncludes: {
    "/api/export": ["./templates/monthly_report.xlsx"],
  },
  eslint: {
    // ESLint is run separately; do not block production builds on lint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
