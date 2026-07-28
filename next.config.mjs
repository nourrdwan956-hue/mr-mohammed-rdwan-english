/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
  // Vercel بيتعامل معها تلقائياً
};

export default nextConfig;