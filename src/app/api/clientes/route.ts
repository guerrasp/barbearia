import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  storeId: z.string(),
});

// GET - Listar clientes
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const search = searchParams.get("search") || "";

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const customers = await prisma.customer.findMany({
    where: {
      storeId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { cpf: { contains: search } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      _count: { select: { appointments: true } },
      appointments: {
        orderBy: { startAt: "desc" },
        take: 1,
        select: { startAt: true, status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(customers);
}

// POST - Criar cliente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = customerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        cpf: data.cpf || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        storeId: data.storeId,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 });
  }
}
