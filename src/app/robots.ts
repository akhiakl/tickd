import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/base-url";

/**
 * Everything past the landing page and the sign-in flow is either
 * auth-gated (`requireValidUserId()`) or a per-user/per-group view with no
 * standalone SEO value - crawling it wastes budget and could surface a
 * group's private data in search results, so those paths are disallowed
 * rather than left to per-page `robots` metadata alone.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/create", "/g/", "/join", "/j/", "/api/"],
    },
    sitemap: `${getBaseUrl()}/sitemap.xml`,
  };
}
