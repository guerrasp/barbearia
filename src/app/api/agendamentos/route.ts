import { prisma } from "@/lib/prisma";
import { checkAvailability, generateAppointmentCode } from "@/lib/scheduling";
import { sendAppointmentConfirmation } from "@/lib/notifications";
import { sendWhatsAppConfirmation } from "@/lib/whatsapp";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserForStore } from "@/lib/auth-server";

const createSchema = z.object({
  storeId: z.string().min(1),
  customerId: z.string().min(1),
  barberId: z.string().min(1),
  startAt: z.string().min(1), // ISO local
  serviceIds: z.array(z.string().min(1)).min(1, "Selecione ao menos 1 serviço"),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  source: z.enum(["ADMIN", "PUBLIC"]).default("ADMIN"),
});

// GET - Listar agendamentos com filtros
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const barberId = searchParams.get("barberId") || undefined;
  const customerId = searchParams.get("customerId") || undefined;
  const status = searchParams.get("status") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search") || "";
  const page = searchParams.get("page");
  const pageSize = Math.min(Number(searchParams.get("pageSize")) || 50, 200);

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const auth = await requireUserForStore(req, storeId);
  if (!auth.ok) return auth.response;

  const where: Record<string, unknown> = { storeId };
  if (barberId) where.barberId = barberId;
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;

  if (from || to) {
    where.startAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const includeRelations = {
    customer: { select: { id: true, name: true, phone: true, email: true } },
    barber: { select: { id: true, name: true } },
    services: {
      include: { service: { select: { id: true, name: true } } },
    },
  };

  if (page) {
    const pageNum = Math.max(1, Number(page));
    const skip = (pageNum - 1) * pageSize;
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: includeRelations,
        orderBy: { startAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.appointment.count({ where }),
    ]);
    return NextResponse.json({
      data: appointments,
      total,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: includeRelations,
    orderBy: { startAt: "desc" },
    take: 500,
  });

  return NextResponse.json(appointments);
}

// POST - Cria agendamento
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const auth = await requireUserForStore(req, data.storeId);
    if (!auth.ok) return auth.response;

    // Busca serviços para calcular duração total + preço congelado
    const services = await prisma.service.findMany({
      where: { id: { in: data.serviceIds }, storeId: data.storeId },
    });
    if (services.length !== data.serviceIds.length) {
      return NextResponse.json(
        { error: "Um ou mais serviços não pertencem à loja" },
        { status: 400 },
      );
    }

    const totalDuration = services.reduce((s, sv) => s + sv.durationMinutes, 0);
    const subtotal = services.reduce((s, sv) => s + sv.price, 0);
    const total = Math.max(0, subtotal - data.discount);

    const startAt = new Date(data.startAt);
    if (isNaN(startAt.getTime())) {
      return NextResponse.json({ error: "startAt inválido" }, { status: 400 });
    }
    const endAt = new Date(startAt.getTime() + totalDuration * 60_000);

    const appointment = await prisma.$transaction(async (tx) => {
      const issue = await checkAvailability({
        barberId: data.barberId,
        startAt,
        endAt,
        tx,
      });
      if (issue) throw Object.assign(new Error(issue.message), { issue, status: 409 });

      const code = await generateAppointmentCode(data.storeId, startAt, tx);

      return tx.appointment.create({
        data: {
          code,
          storeId: data.storeId,
          customerId: data.customerId,
          barberId: data.barberId,
          startAt,
          endAt,
          status: "SCHEDULED",
          source: data.source,
          total,
          discount: data.discount,
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
          customer: true,
          barber: { select: { id: true, name: true } },
          services: { include: { service: { select: { id: true, name: true } } } },
        },
      });
    }, { isolationLevel: "Serializable" });

    // Envia confirmações antes de retornar (aguarda para não perder no serverless)
    await Promise.allSettled([
      sendAppointmentConfirmation(appointment.id),
      sendWhatsAppConfirmation(appointment.id),
    ]);

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const err = error as Error & { issue?: unknown; status?: number };
    if (err.status === 409) {
      return NextResponse.json({ error: err.message, issue: err.issue }, { status: 409 });
    }
    console.error("Erro ao criar agendamento:", error);
    return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
  }
}
