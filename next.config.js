/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep a visited page's server data in the client router cache for
    // 30s, so flicking back to a tab you were just on (Home → My Trips →
    // Home) is instant instead of another server round trip. Any Server
    // Action that calls revalidatePath (starting/ending a trip, saving,
    // removing, etc.) clears this cache, and pull-to-refresh
    // (components/PullToRefresh.tsx) forces fresh data on demand.
    staleTimes: {
      dynamic: 30,
    },
    // Photos are shrunk in the browser first (lib/shrinkImage.ts), so a
    // normal upload is well under this. 4 MB is the backstop (Vercel's
    // own hard limit is 4.5 MB); the 1 MB default rejected every
    // full-size phone photo outright.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

module.exports = nextConfig;
