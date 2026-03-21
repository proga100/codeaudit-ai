import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@codeaudit/db"],
  experimental: {
    // Opt into React 19 features
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
