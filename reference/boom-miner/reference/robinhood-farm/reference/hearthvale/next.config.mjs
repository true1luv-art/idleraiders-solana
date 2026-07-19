/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow loading sprites from /public/assets without next/image optimization.
  images: {
    unoptimized: true,
  },
  eslint: {
    // Don't fail Vercel builds on lint while we're mid-migration.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't fail Vercel builds on type errors while src/ still uses old paths.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
