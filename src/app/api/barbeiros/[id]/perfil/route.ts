import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";
import { z } from "zod";

const profileSchema = z.object({
  bio: z.string().max(500).optional(),
  specialties: z.string().max(200).optional(),
});

/**
 * PUT /api/barbeiros/:id/perfil
 *
 * Permite que o próprio barbeiro edite bio e especialidades.
 * Não permite editar nome, foto, comissão, status (campos admin-only).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: barberId } = await params;

  const auth = await getAuthUser(req);
  if (!auth.ok) return auth.response;

  // Busca o barber e verifica se é o dono
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { storeId: true, userId: true },
  });

  if (!barber) {
    return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
  }

  // Verifica se pertence à mesma loja
  if (barber.storeId !== auth.user.storeId && !auth.user.isSuperAdmin) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  // Se não for admin, só pode editar o próprio perfil
  if (auth.user.role === "BARBER") {
    const userBarber = await prisma.barber.findFirst({
      where: { userId: auth.user.id, storeId: auth.user.storeId },
      select: { id: true },
    });
    if (!userBarber || userBarber.id !== barberId) {
      return NextResponse.json(
        { error: "Você só pode editar seu próprio perfil" },
        { status: 403 },
      );
    }
  }

  try {
    const body = await req.json();
    const data = profileSchema.parse(body);

    const updated = await prisma.barber.update({
      where: { id: barberId },
      data: {
        ...(data.bio !== undefined && { bio: data.bio || null }),
        ...(data.specialties !== undefined && { specialties: data.specialties || null }),
      },
      select: { id: true, bio: true, specialties: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}
