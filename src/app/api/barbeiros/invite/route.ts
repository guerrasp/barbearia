import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminForStore } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const inviteSchema = z.object({
  storeId: z.string().min(1),
  barberId: z.string().min(1),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
});

/**
 * POST /api/barbeiros/invite
 *
 * Admin convida um barbeiro existente para ter login próprio.
 * Cria um User no Supabase + User(role=BARBER) no banco, e vincula ao Barber.
 */
export async function POST(req: NextRequest) {
  let supabaseUserId: string | null = null;

  try {
    const body = await req.json();
    const data = inviteSchema.parse(body);

    const auth = await requireAdminForStore(req, data.storeId);
    if (!auth.ok) return auth.response;

    // Verifica se o barbeiro existe e pertence à loja
    const barber = await prisma.barber.findFirst({
      where: { id: data.barberId, storeId: data.storeId },
      select: { id: true, name: true, userId: true },
    });

    if (!barber) {
      return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
    }

    if (barber.userId) {
      return NextResponse.json(
        { error: "Este barbeiro já possui um login vinculado" },
        { status: 409 },
      );
    }

    // Verifica se o email já está em uso
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Este email já está em uso" },
        { status: 409 },
      );
    }

    // 1. Cria usuário no Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Falha ao criar conta" },
        { status: 400 },
      );
    }
    supabaseUserId = authData.user.id;

    // 2. Cria User no banco e vincula ao Barber
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          supabaseId: authData.user!.id,
          email: data.email.toLowerCase(),
          name: barber.name,
          role: "BARBER",
          storeId: data.storeId,
        },
      });

      await tx.barber.update({
        where: { id: data.barberId },
        data: { userId: newUser.id },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        message: "Login criado com sucesso",
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
      { status: 201 },
    );
  } catch (error) {
    // Rollback Supabase se Prisma falhou
    if (supabaseUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
      } catch { /* swallow */ }
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    }
    console.error("Erro ao convidar barbeiro:", error);
    return NextResponse.json({ error: "Erro ao criar login do barbeiro" }, { status: 500 });
  }
}
