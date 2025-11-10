import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.plan4host.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const urls = [
    "/",
    "/ro",
    "/about",
    "/airbnb-ical-sync",
    "/booking-ical-sync",
    "/expedia-ical-sync",
    "/travelminit-ical-sync",
    "/channel-manager",
    "/checkin-forms-gdpr",
    "/ro/sincronizare-ical-airbnb",
    "/ro/sincronizare-ical-booking",
    "/ro/sincronizare-ical-expedia",
    "/ro/sincronizare-ical-travelminit",
    "/ro/formular-checkin-gdpr",
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
