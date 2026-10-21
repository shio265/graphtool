import type { MetadataRoute } from "next";
import { buildSitemap } from "@/src/lib/sitemap";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
}
