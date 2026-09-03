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
      // No lastModified: there's no real content timestamp to report for
      // the landing page, and stamping "now" on every generation would
      // just be noise that could trigger unnecessary recrawls.
      url: new URL("/", getBaseUrl()).toString(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
