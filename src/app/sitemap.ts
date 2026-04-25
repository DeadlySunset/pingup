import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  return [
    { url: `${appUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${appUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${appUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
