import { publicEnv } from "@/lib/env";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = publicEnv().NEXT_PUBLIC_SITE_URL;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*/company",
          "/*/candidate",
          "/*/admin",
          "/*/sign-in",
          "/*/sign-up",
          "/*/verify-email",
          "/*/forgot-password",
          "/*/reset-password",
          "/*/invite",
          "/api",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
