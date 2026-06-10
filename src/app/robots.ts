import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/super", "/api/"],
    },
    sitemap: "https://korta.ia.br/sitemap.xml",
  };
}
