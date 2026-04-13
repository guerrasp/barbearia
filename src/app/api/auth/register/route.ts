import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  storeName: z.string().min(2),
});

// POST - Registrar novo admin + loja
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Erro ao criar conta" },
        { status: 400 }
      );
    }

    // 2. Criar a loja
    const slug = data.storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const store = await prisma.store.create({
      data: {
        name: data.storeName,
        slug: `${slug}-${Date.now().toString(36)}`,
        email: data.email,
      },
    });

    // 3. Criar o usuário admin no banco
    const user = await prisma.user.create({
      data: {
        supabaseId: authData.user.id,
        email: data.email,
        name: data.name,
        role: "ADMIN",
        storeId: store.id,
      },
    });

    // 4. Criar categorias padrão
    const defaultCategories = ["Perfumes", "Maquiagem", "Skincare", "Cabelos", "Corpo & Banho", "Outros"];
    await prisma.category.createMany({
      data: defaultCategories.map((name) => ({
        name,
        storeId: store.id,
      })),
    });

    return NextResponse.json({ user, store }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro no registro:", error);
    return NextResponse.json({ error: "Erro ao registrar" }, { status: 500 });
  }
}
