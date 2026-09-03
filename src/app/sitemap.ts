import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/base-url";

/**
 * Just the landing page: every other route is either auth-gated
 * (`requireValidUserId()`) or scoped to one user's/group's private data
 * (see robots.ts), so there's nothing else here worth a search engine
 * indexing.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getBaseUrl(),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
