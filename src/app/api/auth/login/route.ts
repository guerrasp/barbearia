import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

// POST - Login
export async function POST(req: NextRequest) {
  // Mitiga força bruta de senha por IP
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: "login" });
  if (limited) return limited;

  try {
    const { email, password } = await req.json();

    // 1. Autenticar no Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    // 2. Buscar o usuário no banco (inclui barber vinculado, se existir)
    const user = await prisma.user.findUnique({
      where: { supabaseId: authData.user.id },
      include: {
        store: true,
        barber: { select: { id: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado no sistema" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storeId: user.storeId,
        customerId: user.customerId,
        barberId: user.barber?.id ?? null,
        store: user.store,
      },
      session: authData.session,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    const message = error instanceof Error ? error.message : "Erro ao fazer login";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
