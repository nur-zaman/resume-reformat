import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default Server Action body limit is 1MB; raised for the PDF resume upload
      // (up to 5MB) plus multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
