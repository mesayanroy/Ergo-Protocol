// Backend API origin. Defaults to the local server; set API_URL in the hosting
// environment (e.g. https://ergo-protocol.onrender.com) for deployed builds.
const apiUrl = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@stellar/stellar-sdk', '@stellar/freighter-api', '@albedo-link/intent'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;