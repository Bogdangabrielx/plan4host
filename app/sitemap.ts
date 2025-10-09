import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.plan4host.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const urls = [
    "/",
    "/ro",
    "/airbnb-ical-sync",
    "/booking-ical-sync",
    "/ro/sincronizare-ical-airbnb",
    "/ro/sincronizare-ical-booking",
    "/docs",
    "/partners",
    "/status",
    "/legal/terms",
    "/legal/privacy",
    "/legal/cookies",
    "/legal/dpa",
  ];
  return urls.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
