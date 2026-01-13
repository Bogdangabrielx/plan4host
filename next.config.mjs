// next.config.mjs
import withPWA from "@ducanh2912/next-pwa";

const withPWAConfigured = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  disable: process.env.NODE_ENV === "development" || process.env.NEXT_DISABLE_PWA === "1",
  workboxOptions: {
    importScripts: ["push-sw.js"],
  },
});

/** @type {import('next').NextConfig} */
const baseConfig = {
  experimental: { serverActions: { allowedOrigins: ["*"] } }
};

export default withPWAConfigured(baseConfig);
