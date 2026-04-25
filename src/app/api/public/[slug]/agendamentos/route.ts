import { prisma } from "@/lib/prisma";
import { checkAvailability, generateAppointmentCode } from "@/lib/scheduling";
import { sendAppointmentConfirmation } from "@/lib/notifications";
import { getTrialStatus } from "@/lib/trial";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  barberId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1),
  startAt: z.string().min(1), // ISO
  customer: z.object({
    name: z.string().min(2, "Nome obrigatório"),
    phone: z.string().min(8, "Telefone obrigatório"),
    email: z.string().email().optional().or(z.literal("")),
  }),
  notes: z.string().optional(),
});

// POST /api/public/[slug]/agendamentos — cria agendamento sem autenticação
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const store = await prisma.store.findUnique({
      where: { slug },
      select: {
        id: true,
        trialEndsAt: true,
        stripeSubscriptionId: true,
      },
    });
    if (!store) {
      return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
    }

    // Bloqueia agendamento público se a loja está com trial expirado e sem assinatura
    const trial = getTrialStatus({
      trialEndsAt: store.trialEndsAt,
      stripeSubscriptionId: store.stripeSubscriptionId,
    });
    if (!trial.canWrite) {
      return NextResponse.json(
        { error: "Esta loja está temporariamente fora do ar. Tente novamente em breve." },
        { status: 503 },
      );
    }

    // Valida barbeiro ativo da loja
    const barber = await prisma.barber.findFirst({
      where: { id: data.barberId, storeId: store.id, isActive: true },
      select: { id: true },
    });
    if (!barber) {
      return NextResponse.json({ error: "Barbeiro inválido" }, { status: 400 });
    }

    // Valida serviços da loja
    const services = await prisma.service.findMany({
      where: {
        id: { in: data.serviceIds },
        storeId: store.id,
        isActive: true,
      },
    });
    if (services.length !== data.serviceIds.length) {
      return NextResponse.json({ error: "Serviços inválidos" }, { status: 400 });
    }

    const totalDuration = services.reduce((s, sv) => s + sv.durationMinutes, 0);
    const subtotal = services.reduce((s, sv) => s + sv.price, 0);

    const startAt = new Date(data.startAt);
    if (isNaN(startAt.getTime())) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }
    const endAt = new Date(startAt.getTime() + totalDuration * 60_000);

    const issue = await checkAvailability({ barberId: data.barberId, startAt, endAt });
    if (issue) {
      return NextResponse.json({ error: issue.message, issue }, { status: 409 });
    }

    // Upsert customer por (storeId, phone) — se já existir, reutiliza
    const phoneDigits = data.customer.phone.replace(/\D/g, "");
    let customer = await prisma.customer.findFirst({
      where: { storeId: store.id, phone: phoneDigits },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          storeId: store.id,
          name: data.customer.name,
          phone: phoneDigits,
          email: data.customer.email || null,
        },
      });
    } else if (customer.name !== data.customer.name || (!customer.email && data.customer.email)) {
      // Atualiza dados se mudou nome ou email vazio
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: data.customer.name,
          email: customer.email || data.customer.email || null,
        },
      });
    }

    const code = await generateAppointmentCode(store.id, startAt);

    const appointment = await prisma.appointment.create({
      data: {
        code,
        storeId: store.id,
        customerId: customer.id,
        barberId: data.barberId,
        startAt,
        endAt,
        status: "SCHEDULED",
        source: "PUBLIC",
        total: subtotal,
        discount: 0,
        notes: data.notes || null,
        services: {
          create: services.map((sv) => ({
            serviceId: sv.id,
            price: sv.price,
            durationMinutes: sv.durationMinutes,
          })),
        },
      },
      include: {
        barber: { select: { name: true } },
        services: { include: { service: { select: { name: true } } } },
      },
    });

    // Dispara email de confirmação (não bloqueia resposta)
    sendAppointmentConfirmation(appointment.id).catch((e) =>
      console.error("Falha ao enviar confirmação:", e),
    );

    return NextResponse.json(
      {
        id: appointment.id,
        code: appointment.code,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        barber: appointment.barber,
        services: appointment.services,
        total: appointment.total,
        status: appointment.status,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar agendamento público:", error);
    return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
  }
}
