import { prisma } from "@/lib/prisma";
import { getAvailableSlots, checkAvailability, generateAppointmentCode } from "@/lib/scheduling";
import { limitsFor } from "@/lib/plan-limits";

/**
 * Chatbot WhatsApp — state machine por conversa.
 *
 * Cada conversa é identificada por (storeId, phone).
 * Estados: menu → choose_service → choose_barber → choose_date → choose_slot → confirmed
 *
 * Em serverless (Vercel), o estado é armazenado no banco via tabela leve.
 * Para MVP, usamos cache in-memory com fallback (perde estado se a instância recicla,
 * mas o usuário simplesmente recomeça — aceitável para v1).
 */

// ── State types ──────────────────────────────────
type ConversationStep =
  | "menu"
  | "choose_service"
  | "choose_barber"
  | "choose_date"
  | "choose_slot"
  | "my_appointments";

interface ConversationState {
  step: ConversationStep;
  storeId: string;
  phone: string;
  serviceIds?: string[];
  serviceName?: string;
  barberId?: string;
  barberName?: string;
  date?: string; // YYYY-MM-DD
  slots?: string[]; // HH:mm[]
  updatedAt: number;
}

// In-memory store (OK para v1 — estado se perde no redeploy, cliente recomeça)
const conversations = new Map<string, ConversationState>();

// Limpa conversas inativas (>30min)
setInterval(() => {
  const cutoff = Date.now() - 30 * 60_000;
  for (const [key, state] of conversations) {
    if (state.updatedAt < cutoff) conversations.delete(key);
  }
}, 60_000).unref();

function convKey(storeId: string, phone: string) {
  return `${storeId}:${phone}`;
}

function getState(storeId: string, phone: string): ConversationState {
  const key = convKey(storeId, phone);
  return conversations.get(key) || { step: "menu", storeId, phone, updatedAt: Date.now() };
}

function setState(state: ConversationState) {
  state.updatedAt = Date.now();
  conversations.set(convKey(state.storeId, state.phone), state);
}

function clearState(storeId: string, phone: string) {
  conversations.delete(convKey(storeId, phone));
}

// ── Helpers ──────────────────────────────────────
function formatPrice(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function parseDateInput(input: string): string | null {
  const lower = input.toLowerCase().trim();
  const now = new Date();

  if (lower === "hoje") {
    return toDateStr(now);
  }
  if (lower === "amanha" || lower === "amanhã") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return toDateStr(d);
  }

  const weekdays: Record<string, number> = {
    domingo: 0, segunda: 1, terca: 2, terça: 2, quarta: 3,
    quinta: 4, sexta: 5, sabado: 6, sábado: 6,
  };

  for (const [name, target] of Object.entries(weekdays)) {
    if (lower.includes(name)) {
      const d = new Date(now);
      const diff = (target - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return toDateStr(d);
    }
  }

  // Tenta DD/MM ou DD/MM/YYYY
  const match = lower.match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?$/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const year = match[3] ? (match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3])) : now.getFullYear();
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return toDateStr(d);
  }

  return null;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Main handler ─────────────────────────────────
export interface ChatbotResult {
  reply: string;
  aiMessageCounted: boolean; // true = conta no limite do plano
}

export async function handleIncomingMessage(
  storeId: string,
  phone: string,
  text: string,
): Promise<ChatbotResult> {
  // Carrega dados da loja
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, slug: true, plan: true },
  });

  if (!store) {
    return { reply: "Loja não encontrada.", aiMessageCounted: false };
  }

  // Verifica se o plano tem acesso ao chatbot
  const limits = limitsFor(store.plan);
  if (limits.aiMessagesPerMonth === 0) {
    return { reply: "", aiMessageCounted: false }; // silencioso — plano não tem chatbot
  }

  // Reset: se digitar "menu", "oi", "olá", "início" → volta ao menu
  const lower = text.toLowerCase().trim();
  if (["menu", "oi", "olá", "ola", "inicio", "início", "voltar", "0"].includes(lower)) {
    clearState(storeId, phone);
  }

  const state = getState(storeId, phone);

  switch (state.step) {
    case "menu":
      return handleMenu(store, state);
    case "choose_service":
      return handleChooseService(store, state, text);
    case "choose_barber":
      return handleChooseBarber(store, state, text);
    case "choose_date":
      return handleChooseDate(store, state, text);
    case "choose_slot":
      return handleChooseSlot(store, state, text);
    case "my_appointments":
      return handleMyAppointments(store, state, text);
    default:
      clearState(storeId, phone);
      return handleMenu(store, state);
  }
}

// ── Step handlers ────────────────────────────────

async function handleMenu(
  store: { id: string; name: string },
  state: ConversationState,
): Promise<ChatbotResult> {
  setState({ ...state, step: "choose_service" });

  const services = await prisma.service.findMany({
    where: { storeId: store.id, isActive: true },
    select: { id: true, name: true, price: true, durationMinutes: true },
    orderBy: { name: "asc" },
  });

  if (services.length === 0) {
    clearState(state.storeId, state.phone);
    return {
      reply: `Olá! A *${store.name}* ainda não configurou serviços. Entre em contato diretamente.`,
      aiMessageCounted: true,
    };
  }

  const list = services
    .map((s, i) => `${i + 1}️⃣ ${s.name} (${formatPrice(s.price)} · ${s.durationMinutes}min)`)
    .join("\n");

  // Salva mapeamento para usar no próximo passo
  setState({
    ...state,
    step: "choose_service",
    serviceIds: services.map((s) => s.id),
  });

  return {
    reply: `Olá! Bem-vindo à *${store.name}* ✂️\n\nQual serviço você deseja?\n\n${list}\n\n_Digite o número ou "0" para voltar._`,
    aiMessageCounted: true,
  };
}

async function handleChooseService(
  store: { id: string; name: string },
  state: ConversationState,
  text: string,
): Promise<ChatbotResult> {
  const services = await prisma.service.findMany({
    where: { storeId: store.id, isActive: true },
    select: { id: true, name: true, price: true, durationMinutes: true },
    orderBy: { name: "asc" },
  });

  const choice = parseInt(text.trim());
  if (isNaN(choice) || choice < 1 || choice > services.length) {
    return { reply: `Opção inválida. Digite um número de 1 a ${services.length}, ou "0" para voltar.`, aiMessageCounted: true };
  }

  const selected = services[choice - 1];

  // Carrega barbeiros
  const barbers = await prisma.barber.findMany({
    where: { storeId: store.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (barbers.length === 0) {
    clearState(state.storeId, state.phone);
    return { reply: "Nenhum barbeiro disponível no momento. Tente novamente mais tarde.", aiMessageCounted: true };
  }

  const list = barbers
    .map((b, i) => `${i + 1}️⃣ ${b.name}`)
    .join("\n");

  setState({
    ...state,
    step: "choose_barber",
    serviceIds: [selected.id],
    serviceName: selected.name,
  });

  return {
    reply: `*${selected.name}* selecionado! 👍\n\nCom qual barbeiro?\n\n${list}\n\n_Digite o número ou "0" para voltar._`,
    aiMessageCounted: true,
  };
}

async function handleChooseBarber(
  store: { id: string; name: string },
  state: ConversationState,
  text: string,
): Promise<ChatbotResult> {
  const barbers = await prisma.barber.findMany({
    where: { storeId: store.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const choice = parseInt(text.trim());
  if (isNaN(choice) || choice < 1 || choice > barbers.length) {
    return { reply: `Opção inválida. Digite um número de 1 a ${barbers.length}, ou "0" para voltar.`, aiMessageCounted: true };
  }

  const selected = barbers[choice - 1];

  setState({
    ...state,
    step: "choose_date",
    barberId: selected.id,
    barberName: selected.name,
  });

  return {
    reply: `Barbeiro: *${selected.name}* ✅\n\nQual dia você prefere?\n\nExemplos:\n• _hoje_\n• _amanhã_\n• _segunda_\n• _15/06_\n\n_Digite "0" para voltar._`,
    aiMessageCounted: true,
  };
}

async function handleChooseDate(
  store: { id: string; name: string },
  state: ConversationState,
  text: string,
): Promise<ChatbotResult> {
  const dateStr = parseDateInput(text);
  if (!dateStr) {
    return { reply: `Não entendi a data. Tente: _hoje_, _amanhã_, _segunda_, ou _15/06_.`, aiMessageCounted: true };
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);

  // Não pode ser no passado
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj < today) {
    return { reply: "Essa data já passou. Escolha uma data a partir de hoje.", aiMessageCounted: true };
  }

  if (!state.barberId || !state.serviceIds?.length) {
    clearState(state.storeId, state.phone);
    return { reply: "Sessão expirada. Mande qualquer mensagem para recomeçar.", aiMessageCounted: true };
  }

  // Busca duração do serviço
  const service = await prisma.service.findUnique({
    where: { id: state.serviceIds[0] },
    select: { durationMinutes: true },
  });

  const slots = await getAvailableSlots({
    barberId: state.barberId,
    date: dateObj,
    durationMinutes: service?.durationMinutes || 30,
    stepMinutes: 30,
  });

  if (slots.length === 0) {
    return {
      reply: `Sem horários disponíveis para *${dateObj.toLocaleDateString("pt-BR")}* com ${state.barberName}.\n\nTente outro dia ou "0" para voltar.`,
      aiMessageCounted: true,
    };
  }

  const list = slots
    .map((s, i) => `${i + 1}️⃣ ${s}`)
    .join("\n");

  setState({
    ...state,
    step: "choose_slot",
    date: dateStr,
    slots,
  });

  return {
    reply: `Horários para *${dateObj.toLocaleDateString("pt-BR")}* com *${state.barberName}*:\n\n${list}\n\n_Digite o número do horário ou "0" para voltar._`,
    aiMessageCounted: true,
  };
}

async function handleChooseSlot(
  store: { id: string; name: string; slug: string },
  state: ConversationState,
  text: string,
): Promise<ChatbotResult> {
  if (!state.slots || !state.date || !state.barberId || !state.serviceIds?.length) {
    clearState(state.storeId, state.phone);
    return { reply: "Sessão expirada. Mande qualquer mensagem para recomeçar.", aiMessageCounted: true };
  }

  const choice = parseInt(text.trim());
  if (isNaN(choice) || choice < 1 || choice > state.slots.length) {
    return { reply: `Opção inválida. Digite de 1 a ${state.slots.length}, ou "0" para voltar.`, aiMessageCounted: true };
  }

  const selectedSlot = state.slots[choice - 1];
  const [y, m, d] = state.date.split("-").map(Number);
  const [h, min] = selectedSlot.split(":").map(Number);
  const startAt = new Date(y, m - 1, d, h, min, 0, 0);

  // Busca serviço para duração e preço
  const service = await prisma.service.findUnique({
    where: { id: state.serviceIds[0] },
    select: { id: true, name: true, price: true, durationMinutes: true },
  });

  if (!service) {
    clearState(state.storeId, state.phone);
    return { reply: "Serviço não encontrado. Mande qualquer mensagem para recomeçar.", aiMessageCounted: true };
  }

  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

  // Verificar disponibilidade (pode ter mudado)
  const issue = await checkAvailability({ barberId: state.barberId, startAt, endAt });
  if (issue) {
    return { reply: `Esse horário acabou de ser ocupado 😕\n\nTente outro horário ou mande "0" para voltar.`, aiMessageCounted: true };
  }

  // Upsert customer
  const phoneDigits = state.phone.replace(/\D/g, "");
  let customer = await prisma.customer.findFirst({
    where: { storeId: state.storeId, phone: phoneDigits },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        storeId: state.storeId,
        name: `WhatsApp ${phoneDigits.slice(-4)}`,
        phone: phoneDigits,
      },
    });
  }

  // Criar agendamento dentro de transação
  const code = await generateAppointmentCode(state.storeId, startAt);

  const appointment = await prisma.appointment.create({
    data: {
      code,
      storeId: state.storeId,
      customerId: customer.id,
      barberId: state.barberId,
      startAt,
      endAt,
      status: "SCHEDULED",
      source: "PUBLIC",
      total: service.price,
      discount: 0,
      services: {
        create: [{
          serviceId: service.id,
          price: service.price,
          durationMinutes: service.durationMinutes,
        }],
      },
    },
  });

  clearState(state.storeId, state.phone);

  const dateFormatted = startAt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return {
    reply: `*Agendamento confirmado!* ✅\n\n📅 ${dateFormatted} às ${selectedSlot}\n✂️ ${service.name}\n💈 ${state.barberName}\n💰 ${formatPrice(service.price)}\n🔐 Código: ${appointment.code}\n\nPara cancelar ou remarcar, mande *cancelar*.\nPara novo agendamento, mande *oi*.`,
    aiMessageCounted: true,
  };
}

async function handleMyAppointments(
  store: { id: string; name: string },
  state: ConversationState,
  _text: string,
): Promise<ChatbotResult> {
  const phoneDigits = state.phone.replace(/\D/g, "");
  const customer = await prisma.customer.findFirst({
    where: { storeId: store.id, phone: phoneDigits },
    select: { id: true },
  });

  if (!customer) {
    clearState(state.storeId, state.phone);
    return { reply: "Não encontramos agendamentos para este número. Mande *oi* para agendar!", aiMessageCounted: true };
  }

  const upcoming = await prisma.appointment.findMany({
    where: {
      customerId: customer.id,
      storeId: store.id,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startAt: { gte: new Date() },
    },
    include: {
      barber: { select: { name: true } },
      services: { include: { service: { select: { name: true } } } },
    },
    orderBy: { startAt: "asc" },
    take: 5,
  });

  clearState(state.storeId, state.phone);

  if (upcoming.length === 0) {
    return { reply: "Você não tem agendamentos futuros. Mande *oi* para agendar!", aiMessageCounted: true };
  }

  const list = upcoming
    .map((a) => {
      const dt = new Date(a.startAt);
      return `📅 ${dt.toLocaleDateString("pt-BR")} ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — ${a.services.map((s) => s.service.name).join(", ")} com ${a.barber.name} (${a.code})`;
    })
    .join("\n\n");

  return {
    reply: `*Seus próximos agendamentos:*\n\n${list}\n\nMande *oi* para novo agendamento.`,
    aiMessageCounted: true,
  };
}
