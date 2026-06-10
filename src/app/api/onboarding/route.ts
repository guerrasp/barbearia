import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { RESERVED_SLUGS } from "@/lib/slugs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeTrialDeadline } from "@/lib/trial";
import { rateLimit } from "@/lib/rate-limit";

const onboardingSchema = z.object({
  storeName: z.string().min(2).max(60),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "slug inválido")
    .refine((s) => !RESERVED_SLUGS.has(s), "slug reservado"),
  ownerName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  // Plano escolhido no site. O trial de 14 dias dá acesso aos recursos
  // DESTE plano (modelo "experimente o plano cheio").
  plan: z.enum(["FREE", "PRO", "BUSINESS", "KORTA_IA"]).optional().default("FREE"),
});

const DEFAULT_SERVICES = [
  { name: "Corte Masculino", price: 45, durationMinutes: 40 },
  { name: "Barba", price: 35, durationMinutes: 30 },
  { name: "Corte + Barba", price: 70, durationMinutes: 60 },
];

// Seg–Sex 09:00–19:00 com pausa 12–13h, Sáb 09:00–14:00
const DEFAULT_HOURS = [
  ...[1, 2, 3, 4, 5].flatMap((weekday) => [
    { weekday, startTime: "09:00", endTime: "12:00" },
    { weekday, startTime: "13:00", endTime: "19:00" },
  ]),
  { weekday: 6, startTime: "09:00", endTime: "14:00" },
];

export async function POST(req: NextRequest) {
  // Criação de loja + usuário Supabase é cara — limita bots de cadastro em massa
  const limited = rateLimit(req, { limit: 5, windowMs: 60 * 60_000, prefix: "onboarding" });
  if (limited) return limited;

  let supabaseUserId: string | null = null;
  try {
    const body = await req.json();
    const data = onboardingSchema.parse(body);

    // Garantir slug livre antes de criar usuário no Supabase
    const existing = await prisma.store.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return NextResponse.json(
        { error: "Esse endereço já foi usado. Escolha outro." },
        { status: 409 },
      );
    }

    // 1. Cria usuário no Supabase Auth (já confirmado)
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

    // 2. Provisiona Store + User(ADMIN) + defaults numa transação
    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: data.storeName,
          slug: data.slug,
          email: data.email,
          phone: data.phone || null,
          plan: data.plan,
          trialEndsAt: computeTrialDeadline(),
        },
      });

      const user = await tx.user.create({
        data: {
          supabaseId: authData.user!.id,
          email: data.email,
          name: data.ownerName,
          role: "ADMIN",
          storeId: store.id,
        },
      });

      const category = await tx.category.create({
        data: { name: "Cabelo & Barba", storeId: store.id },
      });

      await tx.service.createMany({
        data: DEFAULT_SERVICES.map((s) => ({
          ...s,
          storeId: store.id,
          categoryId: category.id,
        })),
      });

      const barber = await tx.barber.create({
        data: {
          name: data.ownerName,
          storeId: store.id,
          isActive: true,
        },
      });

      await tx.workingHours.createMany({
        data: DEFAULT_HOURS.map((h) => ({ ...h, barberId: barber.id })),
      });

      return { store, user };
    });

    return NextResponse.json(
      {
        store: { id: result.store.id, name: result.store.name, slug: result.store.slug },
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          storeId: result.user.storeId,
          customerId: null,
          barberId: null,
          store: result.store,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    // Rollback do Supabase se o Prisma falhou após criar o auth user
    if (supabaseUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
      } catch {
        /* swallow */
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    }
    console.error("Onboarding error:", error);
    const message = error instanceof Error ? error.message : "Erro ao criar loja";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
