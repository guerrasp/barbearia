import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Buscar loja por slug (usado no cadastro de clientes)
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");

    // Se slug fornecido, busca específica
    if (slug) {
      const store = await prisma.store.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true },
      });
      if (!store) {
        return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
      }
      return NextResponse.json(store);
    }

    // Sem slug, retorna a primeira loja (para cadastro direto)
    const store = await prisma.store.findFirst({
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "asc" },
    });

    if (!store) {
      return NextResponse.json({ error: "Nenhuma loja encontrada" }, { status: 404 });
    }

    return NextResponse.json(store);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar loja" }, { status: 500 });
  }
}
