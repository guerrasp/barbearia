import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const RESERVED = new Set([
  "admin",
  "api",
  "agendar",
  "cadastro",
  "criar-loja",
  "login",
  "app",
  "korta",
  "static",
  "_next",
  "public",
  "sobre",
  "para-barbearias",
  "termos",
  "privacidade",
  "contato",
]);

function normalize(raw: string) {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("slug")?.trim() ?? "";
  if (!raw) {
    return NextResponse.json({ available: false, reason: "empty" }, { status: 200 });
  }

  const slug = normalize(raw);

  if (slug.length < 3) {
    return NextResponse.json({ available: false, slug, reason: "too_short" });
  }
  if (slug.length > 40) {
    return NextResponse.json({ available: false, slug, reason: "too_long" });
  }
  if (RESERVED.has(slug)) {
    return NextResponse.json({ available: false, slug, reason: "reserved" });
  }

  const existing = await prisma.store.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ available: false, slug, reason: "taken" });
  }

  return NextResponse.json({ available: true, slug });
}
