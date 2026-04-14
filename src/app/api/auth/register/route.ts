import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  // storeName é obrigatório para admin, opcional para cliente
  storeName: z.string().optional(),
  // storeId é usado quando admin cadastra um cliente
  storeId: z.string().optional(),
  role: z.enum(["ADMIN", "CUSTOMER"]).default("CUSTOMER"),
});

// POST - Registrar usuário
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      console.error("Supabase Auth error:", authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Erro ao criar conta no sistema de autenticação" },
        { status: 400 }
      );
    }

    // 2. Se é ADMIN, criar loja nova
    if (data.role === "ADMIN" && data.storeName) {
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

      const user = await prisma.user.create({
        data: {
          supabaseId: authData.user.id,
          email: data.email,
          name: data.name,
          role: "ADMIN",
          storeId: store.id,
        },
      });

      // Criar categorias padrão
      const defaultCategories = ["Perfumes", "Maquiagem", "Skincare", "Cabelos", "Corpo & Banho", "Outros"];
      await prisma.category.createMany({
        data: defaultCategories.map((name) => ({
          name,
          storeId: store.id,
        })),
      });

      return NextResponse.json({ user, store }, { status: 201 });
    }

    // 3. Se é CUSTOMER, vincular a uma loja existente
    if (data.storeId) {
      // Verificar se já existe um customer com esse email
      const existingCustomer = await prisma.customer.findFirst({
        where: { email: data.email, storeId: data.storeId },
      });

      const user = await prisma.user.create({
        data: {
          supabaseId: authData.user.id,
          email: data.email,
          name: data.name,
          role: "CUSTOMER",
          storeId: data.storeId,
          customerId: existingCustomer?.id || undefined,
        },
      });

      return NextResponse.json({ user }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Dados insuficientes para o cadastro" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro no registro:", error);
    const message = error instanceof Error ? error.message : "Erro ao registrar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
