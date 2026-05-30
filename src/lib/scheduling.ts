import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

// Fuso padrão do negócio. Todas as barbearias operam no horário de Brasília.
const BIZ_TZ = "America/Sao_Paulo";

function nowInBizTz(): Date {
  const s = new Date().toLocaleString("sv-SE", { timeZone: BIZ_TZ });
  return new Date(s.replace(" ", "T"));
}

/**
 * Helpers de agendamento:
 * - conflito com outros Appointments
 * - dentro de WorkingHours (recorrência semanal)
 * - fora de TimeBlocks (bloqueios pontuais)
 * - geração de slots livres para um dia
 */

// "HH:mm" → minutos desde 00:00
function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHhmm(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export type AvailabilityIssue =
  | { kind: "outside_working_hours"; message: string }
  | { kind: "time_block"; message: string }
  | { kind: "appointment_conflict"; message: string; conflictId?: string };

export interface CheckAvailabilityInput {
  barberId: string;
  startAt: Date;
  endAt: Date;
  /** Se estiver editando um agendamento, ignorar conflito com ele mesmo */
  excludeAppointmentId?: string;
  /** Prisma client transacional — usa o global se omitido */
  tx?: TxClient;
}

/**
 * Verifica se o intervalo [startAt, endAt) está disponível para o barbeiro.
 * Retorna null se OK, ou a primeira pendência encontrada.
 */
export async function checkAvailability(
  input: CheckAvailabilityInput,
): Promise<AvailabilityIssue | null> {
  const { barberId, startAt, endAt, excludeAppointmentId, tx } = input;
  const db = tx ?? prisma;

  if (endAt <= startAt) {
    return { kind: "outside_working_hours", message: "Intervalo inválido" };
  }

  const weekday = startAt.getDay(); // 0..6
  const startMin = startAt.getHours() * 60 + startAt.getMinutes();
  const endMin = endAt.getHours() * 60 + endAt.getMinutes();

  // Precisa cair no mesmo dia (simplificação: não atravessa meia-noite)
  if (
    startAt.getFullYear() !== endAt.getFullYear() ||
    startAt.getMonth() !== endAt.getMonth() ||
    startAt.getDate() !== endAt.getDate()
  ) {
    return {
      kind: "outside_working_hours",
      message: "Agendamento não pode cruzar a meia-noite",
    };
  }

  // 1. Working hours
  const workingHours = await db.workingHours.findMany({
    where: { barberId, weekday },
  });

  if (workingHours.length === 0) {
    return {
      kind: "outside_working_hours",
      message: "Barbeiro não atende neste dia",
    };
  }

  const fitsInBlock = workingHours.some((wh) => {
    const s = hhmmToMinutes(wh.startTime);
    const e = hhmmToMinutes(wh.endTime);
    return startMin >= s && endMin <= e;
  });

  if (!fitsInBlock) {
    return {
      kind: "outside_working_hours",
      message: "Horário fora da jornada do barbeiro",
    };
  }

  // 2. Time blocks (bloqueios pontuais) — overlap
  const overlappingBlock = await db.timeBlock.findFirst({
    where: {
      barberId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });

  if (overlappingBlock) {
    return {
      kind: "time_block",
      message: overlappingBlock.reason
        ? `Bloqueio: ${overlappingBlock.reason}`
        : "Período bloqueado pelo barbeiro",
    };
  }

  // 3. Outros agendamentos ativos
  const conflicting = await db.appointment.findFirst({
    where: {
      barberId,
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, startAt: true, endAt: true },
  });

  if (conflicting) {
    return {
      kind: "appointment_conflict",
      message: "Já existe agendamento nesse horário",
      conflictId: conflicting.id,
    };
  }

  return null;
}

/**
 * Gera slots disponíveis (em minutos desde 00:00) para um barbeiro num dia,
 * considerando working hours, time blocks, agendamentos, e duração total desejada.
 *
 * @param stepMinutes passo entre slots (default 15)
 */
export async function getAvailableSlots(params: {
  barberId: string;
  date: Date; // qualquer horário no dia desejado (usamos apenas y/m/d)
  durationMinutes: number;
  stepMinutes?: number;
}): Promise<string[]> {
  const { barberId, date, durationMinutes, stepMinutes = 30 } = params;

  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const weekday = new Date(y, m, d).getDay();

  const workingHours = await prisma.workingHours.findMany({
    where: { barberId, weekday },
    orderBy: { startTime: "asc" },
  });
  if (workingHours.length === 0) return [];

  const dayStart = new Date(y, m, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m, d, 23, 59, 59, 999);

  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        barberId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.timeBlock.findMany({
      where: {
        barberId,
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  // Converte intervalos ocupados para minutos do dia
  const busy: Array<[number, number]> = [];
  const toDayMin = (dt: Date) => {
    // clampa pra dentro do dia
    if (dt < dayStart) return 0;
    if (dt > dayEnd) return 24 * 60;
    return dt.getHours() * 60 + dt.getMinutes();
  };
  for (const a of appointments) {
    busy.push([toDayMin(a.startAt), toDayMin(a.endAt)]);
  }
  for (const b of blocks) {
    busy.push([toDayMin(b.startAt), toDayMin(b.endAt)]);
  }

  const slots: string[] = [];
  const now = nowInBizTz();
  const isToday =
    now.getFullYear() === y && now.getMonth() === m && now.getDate() === d;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const wh of workingHours) {
    const winStart = hhmmToMinutes(wh.startTime);
    const winEnd = hhmmToMinutes(wh.endTime);
    for (let t = winStart; t + durationMinutes <= winEnd; t += stepMinutes) {
      // Se for hoje, não oferecer horários passados
      if (isToday && t < nowMin) continue;

      const end = t + durationMinutes;
      const overlaps = busy.some(([bs, be]) => t < be && end > bs);
      if (!overlaps) slots.push(minutesToHhmm(t));
    }
  }

  return slots;
}

/**
 * Gera um código único sequencial para o agendamento: AG-YYYYMMDD-XXX
 */
export async function generateAppointmentCode(storeId: string, at: Date, tx?: TxClient): Promise<string> {
  const db = tx ?? prisma;
  const y = at.getFullYear();
  const m = (at.getMonth() + 1).toString().padStart(2, "0");
  const d = at.getDate().toString().padStart(2, "0");
  const prefix = `AG-${y}${m}${d}`;

  const count = await db.appointment.count({
    where: {
      storeId,
      code: { startsWith: prefix },
    },
  });

  return `${prefix}-${(count + 1).toString().padStart(3, "0")}`;
}
