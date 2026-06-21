import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Base-resume parsing accepts a PDF upload (up to MAX_RESUME_PDF_BYTES = 5 MB).
      // The default Server Action body limit is 1 MB; raise it with headroom for the
      // multipart envelope. Keep this comfortably above the PDF cap in lib/resume/input.ts.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
