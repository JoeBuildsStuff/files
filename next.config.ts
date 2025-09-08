import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  // Configure API routes to handle larger file uploads
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Allow up to 50MB file uploads
    },
  }
};

export default nextConfig;
