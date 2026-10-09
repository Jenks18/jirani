import type { MetadataRoute } from "next";
import { org } from "@/config/org";

const pages = ["", "/how-it-works", "/safety", "/safety-net", "/about", "/contact", "/privacy", "/terms", "/cookies", "/data-deletion", "/accessibility"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return pages.map((p) => ({
    url: `${org.mainUrl}${p}`,
    lastModified,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.6,
  }));
}
