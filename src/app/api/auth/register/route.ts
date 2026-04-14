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
  // storeSlug é usado no auto-cadastro do cliente
  storeSlug: z.string().optional(),
  role: z.enum(["ADMIN", "CUSTOMER"]).default("CUSTOMER"),
  // Campos extras do cliente
  phone: z.string().optional(),
  cpf: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "NOT_SPECIFIED"]).optional(),
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
    let resolvedStoreId = data.storeId;

    // Resolver storeId via slug se necessário
    if (!resolvedStoreId && data.storeSlug) {
      const store = await prisma.store.findUnique({
        where: { slug: data.storeSlug },
      });
      if (!store) {
        // Limpar usuário do Supabase se loja não existe
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
      }
      resolvedStoreId = store.id;
    }

    if (resolvedStoreId) {
      // Verificar se já existe um customer com esse email
      const existingCustomer = await prisma.customer.findFirst({
        where: { email: data.email, storeId: resolvedStoreId },
      });

      // Criar ou reutilizar registro de Customer
      let customerId = existingCustomer?.id;
      if (!customerId) {
        const customer = await prisma.customer.create({
          data: {
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            cpf: data.cpf || null,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            zipCode: data.zipCode || null,
            birthDate: data.birthDate ? new Date(data.birthDate) : null,
            gender: data.gender || "NOT_SPECIFIED",
            storeId: resolvedStoreId,
          },
        });
        customerId = customer.id;
      }

      const user = await prisma.user.create({
        data: {
          supabaseId: authData.user.id,
          email: data.email,
          name: data.name,
          role: "CUSTOMER",
          storeId: resolvedStoreId,
          customerId,
        },
      });

      return NextResponse.json({ user }, { status: 201 });
    }

    // Limpar usuário do Supabase se dados insuficientes
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
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
