import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  // Simplify and proxy API routes to prevent cross-origin issues in preview context
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "/api/pixelshop/:path*",
      },
    ];
  },
};

export default nextConfig;

