import { prisma } from "@/lib/prisma";
import { checkAvailability } from "@/lib/scheduling";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserForStore } from "@/lib/auth-server";

const statusEnum = z.enum([
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

const paymentEnum = z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD"]);

const updateSchema = z.object({
  status: statusEnum.optional(),
  paymentMethod: paymentEnum.nullable().optional(),
  paid: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  cancelReason: z.string().nullable().optional(),
  discount: z.coerce.number().min(0).optional(),
  // Reagendar: se vier startAt, recalcula endAt a partir dos serviços existentes
  startAt: z.string().optional(),
  barberId: z.string().optional(),
  serviceIds: z.array(z.string().min(1)).optional(),
});

// GET - detalhes
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      customer: true,
      barber: { select: { id: true, name: true } },
      services: { include: { service: true } },
      store: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!appointment) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }
  const auth = await requireUserForStore(req, appointment.storeId);
  if (!auth.ok) return auth.response;
  return NextResponse.json(appointment);
}

// PUT - atualização parcial (status, pagamento, reagendamento, troca de serviços)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { services: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    const auth = await requireUserForStore(req, existing.storeId);
    if (!auth.ok) return auth.response;

    const update: Record<string, unknown> = {};

    // Status
    if (data.status !== undefined) {
      update.status = data.status;
      if (data.status === "CANCELLED" && !existing.cancelledAt) {
        update.cancelledAt = new Date();
      }
      if (data.status === "COMPLETED" && !existing.paid && data.paid === undefined) {
        // mantém paid como veio
      }
    }

    // Pagamento
    if (data.paymentMethod !== undefined) update.paymentMethod = data.paymentMethod;
    if (data.paid !== undefined) {
      update.paid = data.paid;
      update.paidAt = data.paid ? new Date() : null;
    }

    if ("notes" in data) update.notes = data.notes ?? null;
    if ("cancelReason" in data) update.cancelReason = data.cancelReason ?? null;

    // Recalcular total se discount mudou
    let subtotal = existing.services.reduce((s, sv) => s + sv.price * 1, 0);
    let shouldRecomputeTotal = false;
    if (data.discount !== undefined) {
      update.discount = data.discount;
      shouldRecomputeTotal = true;
    }

    // Reagendamento / troca de serviços
    const needsReschedule =
      data.startAt !== undefined ||
      data.barberId !== undefined ||
      data.serviceIds !== undefined;

    let newServiceLinks: { serviceId: string; price: number; durationMinutes: number }[] | null = null;
    let newStartAt = existing.startAt;
    let newEndAt = existing.endAt;
    let newBarberId = existing.barberId;

    if (needsReschedule) {
      if (data.barberId) newBarberId = data.barberId;

      if (data.serviceIds) {
        const services = await prisma.service.findMany({
          where: { id: { in: data.serviceIds }, storeId: existing.storeId },
        });
        if (services.length !== data.serviceIds.length) {
          return NextResponse.json(
            { error: "Um ou mais serviços não pertencem à loja" },
            { status: 400 },
          );
        }
        newServiceLinks = services.map((sv) => ({
          serviceId: sv.id,
          price: sv.price,
          durationMinutes: sv.durationMinutes,
        }));
        subtotal = services.reduce((s, sv) => s + sv.price, 0);
        shouldRecomputeTotal = true;
      }

      const totalDuration = (newServiceLinks ?? existing.services).reduce(
        (s, sv) => s + sv.durationMinutes,
        0,
      );

      if (data.startAt) {
        newStartAt = new Date(data.startAt);
        if (isNaN(newStartAt.getTime())) {
          return NextResponse.json({ error: "startAt inválido" }, { status: 400 });
        }
      }
      newEndAt = new Date(newStartAt.getTime() + totalDuration * 60_000);

      // Disponibilidade (ignorando o próprio)
      const issue = await checkAvailability({
        barberId: newBarberId,
        startAt: newStartAt,
        endAt: newEndAt,
        excludeAppointmentId: id,
      });
      if (issue) {
        return NextResponse.json({ error: issue.message, issue }, { status: 409 });
      }

      update.barberId = newBarberId;
      update.startAt = newStartAt;
      update.endAt = newEndAt;
    }

    if (shouldRecomputeTotal) {
      const discount =
        data.discount !== undefined ? data.discount : existing.discount;
      update.total = Math.max(0, subtotal - discount);
    }

    const appointment = await prisma.$transaction(async (tx) => {
      if (newServiceLinks) {
        await tx.appointmentService.deleteMany({ where: { appointmentId: id } });
        await tx.appointmentService.createMany({
          data: newServiceLinks.map((sv) => ({
            appointmentId: id,
            serviceId: sv.serviceId,
            price: sv.price,
            durationMinutes: sv.durationMinutes,
          })),
        });
      }

      return tx.appointment.update({
        where: { id },
        data: update,
        include: {
          customer: true,
          barber: { select: { id: true, name: true } },
          services: { include: { service: { select: { id: true, name: true } } } },
        },
      });
    });

    return NextResponse.json(appointment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao atualizar agendamento:", error);
    return NextResponse.json({ error: "Erro ao atualizar agendamento" }, { status: 500 });
  }
}

// DELETE - soft-cancel se status != SCHEDULED; hard delete se ainda SCHEDULED
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    const auth = await requireUserForStore(req, existing.storeId);
    if (!auth.ok) return auth.response;

    if (existing.status === "SCHEDULED") {
      await prisma.appointment.delete({ where: { id } });
      return NextResponse.json({ message: "Agendamento removido" });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });
    return NextResponse.json({
      message: "Agendamento cancelado (histórico preservado)",
      appointment,
    });
  } catch (error) {
    console.error("Erro ao remover agendamento:", error);
    return NextResponse.json({ error: "Erro ao remover agendamento" }, { status: 500 });
  }
}
