/** @type {import('next').NextConfig} */
const runtimeCaching = require('next-pwa/cache');

const customRuntimeCaching = [
  {
    urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
    handler: 'NetworkFirst',
    options: {
      cacheName: 'api',
      networkTimeoutSeconds: 5,
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 60 * 60,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
];

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [...runtimeCaching, ...customRuntimeCaching],
  fallbacks: {
    document: '/offline',
  },
});

const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
