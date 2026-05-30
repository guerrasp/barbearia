import { prisma } from "@/lib/prisma";
import { RESERVED_SLUGS, normalizeSlug } from "@/lib/slugs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserForStore } from "@/lib/auth-server";

const SLUG_COOLDOWN_DAYS = 15;

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(3).max(40).optional(),
  phone: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  address: z.string().nullish(),
  logo: z.string().nullish(),
  coverImage: z.string().nullish(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireUserForStore(req, id);
    if (!auth.ok) return auth.response;
    const store = await prisma.store.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        slugChangedAt: true,
        phone: true,
        email: true,
        address: true,
        logo: true,
        coverImage: true,
      },
    });
    if (!store) {
      return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
    }
    return NextResponse.json(store);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar loja" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireUserForStore(req, id);
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    // Validação de slug com cooldown de 15 dias
    let slugUpdate: { slug?: string; slugChangedAt?: Date } = {};
    if (data.slug !== undefined) {
      const newSlug = normalizeSlug(data.slug);

      if (newSlug.length < 3) {
        return NextResponse.json({ error: "Slug deve ter pelo menos 3 caracteres" }, { status: 400 });
      }
      if (RESERVED_SLUGS.has(newSlug)) {
        return NextResponse.json({ error: "Este nome está reservado" }, { status: 400 });
      }

      // Busca store atual para verificar cooldown
      const current = await prisma.store.findUnique({
        where: { id },
        select: { slug: true, slugChangedAt: true },
      });

      if (current && current.slug !== newSlug) {
        // Verifica cooldown
        if (current.slugChangedAt) {
          const diffMs = Date.now() - current.slugChangedAt.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays < SLUG_COOLDOWN_DAYS) {
            const remaining = Math.ceil(SLUG_COOLDOWN_DAYS - diffDays);
            return NextResponse.json(
              { error: `Você só pode alterar o slug novamente em ${remaining} dia${remaining > 1 ? "s" : ""}` },
              { status: 429 },
            );
          }
        }

        // Verifica disponibilidade
        const taken = await prisma.store.findUnique({ where: { slug: newSlug } });
        if (taken) {
          return NextResponse.json({ error: "Este slug já está em uso" }, { status: 409 });
        }

        slugUpdate = { slug: newSlug, slugChangedAt: new Date() };
      }
    }

    const updated = await prisma.store.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.logo !== undefined && { logo: data.logo || null }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage || null }),
        ...slugUpdate,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        slugChangedAt: true,
        phone: true,
        email: true,
        address: true,
        logo: true,
        coverImage: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Erro PATCH store:", err);
    const message = err instanceof Error ? err.message : "Erro ao atualizar loja";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
