import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// POST - Login
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // 1. Autenticar no Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    // 2. Buscar o usuário no banco
    const user = await prisma.user.findUnique({
      where: { supabaseId: authData.user.id },
      include: { store: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado no sistema" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user,
      session: authData.session,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao fazer login" }, { status: 500 });
  }
}
