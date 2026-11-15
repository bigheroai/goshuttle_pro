/** @type {import('next').NextConfig} */

// Public (browser-safe) variables. The NEXT_PUBLIC_* names are preferred; the
// legacy VITE_* names are still accepted so existing environment settings keep
// working. Never add secrets (Resend, PayMongo, service-role keys) here.
const publicEnv = (name) => process.env[`NEXT_PUBLIC_${name}`] || process.env[`VITE_${name}`] || '';

const nextConfig = {
  reactStrictMode: false,
  agentRules: false,
  compiler: {
    // Strip debug console.log/info/debug output from production bundles while
    // keeping console.error and console.warn for real problems.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: publicEnv('SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publicEnv('SUPABASE_ANON_KEY'),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: publicEnv('GOOGLE_MAPS_API_KEY'),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

export default nextConfig;
