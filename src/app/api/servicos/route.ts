import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertStoreCanWrite } from "@/lib/guards";
import { requireAdminForStore } from "@/lib/auth-server";

const serviceSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Preço deve ser maior que zero"),
  durationMinutes: z.coerce.number().int().positive("Duração obrigatória"),
  image: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  storeId: z.string(),
});

// GET - Listar serviços da loja (com filtro opcional de busca / categoria / status)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId");
  const onlyActive = searchParams.get("onlyActive") === "true";

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const auth = await requireAdminForStore(req, storeId);
  if (!auth.ok) return auth.response;

  const services = await prisma.service.findMany({
    where: {
      storeId,
      ...(onlyActive && { isActive: true }),
      ...(categoryId && { categoryId }),
      ...(search && { name: { contains: search, mode: "insensitive" } }),
    },
    include: { category: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(services);
}

// POST - Criar serviço
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = serviceSchema.parse(body);

    const auth = await requireAdminForStore(req, data.storeId);
    if (!auth.ok) return auth.response;

    const blocked = await assertStoreCanWrite(data.storeId);
    if (blocked) return blocked;

    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description || null,
        price: data.price,
        durationMinutes: data.durationMinutes,
        image: data.image || null,
        categoryId: data.categoryId || null,
        isActive: data.isActive ?? true,
        storeId: data.storeId,
      },
      include: { category: true },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar serviço" }, { status: 500 });
  }
}
