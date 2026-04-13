import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Listar categorias da loja
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const categories = await prisma.category.findMany({
    where: { storeId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

// POST - Criar categoria
export async function POST(req: NextRequest) {
  try {
    const { name, storeId } = await req.json();

    if (!name || !storeId) {
      return NextResponse.json({ error: "Nome e storeId obrigatórios" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name, storeId },
    });

    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar categoria" }, { status: 500 });
  }
}
