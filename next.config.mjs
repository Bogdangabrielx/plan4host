// next.config.mjs
import withPWA from "@ducanh2912/next-pwa";

const withPWAConfigured = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  disable: process.env.NODE_ENV === "development"
});

/** @type {import('next').NextConfig} */
const baseConfig = {
  experimental: { serverActions: { allowedOrigins: ["*"] } }
};

export default withPWAConfigured(baseConfig);