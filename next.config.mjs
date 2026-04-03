// next.config.mjs
import withPWA from "@ducanh2912/next-pwa";

const withPWAConfigured = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  cacheStartUrl: false,
  dynamicStartUrl: false,
  cacheOnFrontEndNav: false,
  disable: process.env.NODE_ENV === "development" || process.env.NEXT_DISABLE_PWA === "1",
  publicExcludes: [
    "!noprecache/**/*",
    "!**/*.{png,jpg,jpeg,JPG,JPEG,gif,webp,avif,mp4,MP4,mov,webm,psd,csv,pdf}",
    "!fonts/**/*",
  ],
  workboxOptions: {
    importScripts: ["push-sw.js"],
  },
});

/** @type {import('next').NextConfig} */
const baseConfig = {
  experimental: { serverActions: { allowedOrigins: ["*"] } }
};

export default withPWAConfigured(baseConfig);
