import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/terms", "/privacy", "/status/"],
        disallow: ["/monitors/", "/channels", "/subscribe/", "/api/", "/p/"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
