import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserForStore } from "@/lib/auth-server";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
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
    const updated = await prisma.store.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.logo !== undefined && { logo: data.logo || null }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage || null }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
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
