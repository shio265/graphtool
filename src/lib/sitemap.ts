import type { MetadataRoute } from "next";

export function buildSitemap(siteUrl: string): MetadataRoute.Sitemap {
  const url = new URL(siteUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("The sitemap site URL must be an HTTP(S) URL without credentials.");
  }
  // Shared graph selections are UI state, not separate pages to index.
  url.search = "";
  url.hash = "";
  return [{ url: url.href, priority: 1 }];
}
