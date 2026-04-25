import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireUserForStore } from "@/lib/auth-server";

/** Carrega cliente + storeId pra autorizar. Retorna null se 404. */
async function loadCustomerStore(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    select: { storeId: true },
  });
}

// GET - Buscar cliente por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ownership = await loadCustomerStore(id);
  if (!ownership) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  const auth = await requireUserForStore(req, ownership.storeId);
  if (!auth.ok) return auth.response;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { startAt: "desc" },
        include: {
          barber: { select: { id: true, name: true } },
          services: { include: { service: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  return NextResponse.json(customer);
}

// PUT - Atualizar cliente
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const ownership = await loadCustomerStore(id);
    if (!ownership) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }
    const auth = await requireUserForStore(req, ownership.storeId);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        cpf: body.cpf || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zipCode: body.zipCode || null,
      },
    });

    return NextResponse.json(customer);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar cliente" }, { status: 500 });
  }
}

// DELETE - Remover cliente
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const ownership = await loadCustomerStore(id);
    if (!ownership) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }
    const auth = await requireUserForStore(req, ownership.storeId);
    if (!auth.ok) return auth.response;

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ message: "Cliente removido" });
  } catch {
    return NextResponse.json({ error: "Erro ao remover cliente" }, { status: 500 });
  }
}
