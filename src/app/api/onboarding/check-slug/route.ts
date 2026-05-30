import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RESERVED_SLUGS, normalizeSlug } from "@/lib/slugs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("slug")?.trim() ?? "";
  if (!raw) {
    return NextResponse.json({ available: false, reason: "empty" }, { status: 200 });
  }

  const slug = normalizeSlug(raw);

  if (slug.length < 3) {
    return NextResponse.json({ available: false, slug, reason: "too_short" });
  }
  if (slug.length > 40) {
    return NextResponse.json({ available: false, slug, reason: "too_long" });
  }
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ available: false, slug, reason: "reserved" });
  }

  const existing = await prisma.store.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ available: false, slug, reason: "taken" });
  }

  return NextResponse.json({ available: true, slug });
}
