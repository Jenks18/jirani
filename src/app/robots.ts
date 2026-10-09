import type { MetadataRoute } from "next";
import { org } from "@/config/org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${org.mainUrl}/sitemap.xml`,
  };
}
