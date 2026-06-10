import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = "https://korta.ia.br";

// Regenera a cada 1h pra incluir lojas novas sem precisar de redeploy
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/para-barbearias`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/criar-loja`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/termos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Páginas públicas de agendamento das barbearias (SEO local de cada loja)
  let storePages: MetadataRoute.Sitemap = [];
  try {
    const stores = await prisma.store.findMany({
      select: { slug: true, updatedAt: true },
    });
    storePages = stores.map((s) => ({
      url: `${BASE}/agendar/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // Sem banco no build — devolve só as estáticas
  }

  return [...staticPages, ...storePages];
}
