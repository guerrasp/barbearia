import { prisma } from "@/lib/prisma";
import { getAvailableSlots, checkAvailability, generateAppointmentCode } from "@/lib/scheduling";
import { limitsFor } from "@/lib/plan-limits";
import { parseIntent, isAiEnabled, generateReply, type AiParsedIntent } from "@/lib/ai-chatbot";

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

// Estado persistido no banco (tabela chatbot_conversations).
// Em serverless a memória não é compartilhada entre instâncias, então
// cada mensagem é carregada/salva no banco para a conversa não "resetar".

async function loadConv(storeId: string, phone: string): Promise<ConversationState> {
  const row = await prisma.chatbotConversation.findUnique({
    where: { storeId_phone: { storeId, phone } },
  });
  if (!row) return { step: "menu", storeId, phone, updatedAt: Date.now() };
  const data = (row.data ?? {}) as unknown as Partial<ConversationState>;
  return {
    step: row.step as ConversationStep,
    storeId,
    phone,
    serviceIds: data.serviceIds,
    serviceName: data.serviceName,
    barberId: data.barberId,
    barberName: data.barberName,
    date: data.date,
    slots: data.slots,
    updatedAt: row.updatedAt.getTime(),
  };
}

async function saveConv(state: ConversationState) {
  const { storeId, phone, step } = state;
  const data = {
    serviceIds: state.serviceIds ?? null,
    serviceName: state.serviceName ?? null,
    barberId: state.barberId ?? null,
    barberName: state.barberName ?? null,
    date: state.date ?? null,
    slots: state.slots ?? null,
  };
  await prisma.chatbotConversation.upsert({
    where: { storeId_phone: { storeId, phone } },
    create: { storeId, phone, step, data },
    update: { step, data },
  });
}

async function dropConv(storeId: string, phone: string) {
  await prisma.chatbotConversation.deleteMany({ where: { storeId, phone } });
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

  // Reset: se digitar "menu", "voltar", "0" → volta ao menu
  const lower = text.toLowerCase().trim();
  if (["menu", "voltar", "0"].includes(lower)) {
    await dropConv(storeId, phone);
  }

  const state = await loadConv(storeId, phone);

  // ── Modo IA: tenta resolver com linguagem natural ──
  if (isAiEnabled() && state.step === "menu") {
    const aiResult = await handleAiMessage(store, state, text);
    if (aiResult) return aiResult;
    // Se IA não conseguiu resolver, cai no fluxo menu numerado
  }

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
      await dropConv(storeId, phone);
      return handleMenu(store, state);
  }
}

// ── AI handler ───────────────────────────────────

async function handleAiMessage(
  store: { id: string; name: string; slug: string; plan: string },
  state: ConversationState,
  text: string,
): Promise<ChatbotResult | null> {
  // Carrega contexto da loja para a IA
  const [services, barbers] = await Promise.all([
    prisma.service.findMany({
      where: { storeId: store.id, isActive: true },
      select: { id: true, name: true, price: true, durationMinutes: true },
      orderBy: { name: "asc" },
    }),
    prisma.barber.findMany({
      where: { storeId: store.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (services.length === 0) return null; // cai no menu

  const parsed = await parseIntent(text, {
    storeName: store.name,
    services: services.map((s) => s.name),
    barbers: barbers.map((b) => b.name),
  });

  // Saudação → resposta acolhedora + perguntar o que precisa
  if (parsed.intent === "saudacao") {
    const reply = await generateReply(
      `O cliente mandou uma saudação. Dê boas-vindas e pergunte como pode ajudar. Mencione que pode agendar horário, ver agendamentos ou tirar dúvidas. Serviços: ${services.map((s) => s.name).join(", ")}`,
      { storeName: store.name },
    );
    return { reply, aiMessageCounted: true };
  }

  // Meus agendamentos
  if (parsed.intent === "meus_agendamentos") {
    await saveConv({ ...state, step: "my_appointments" });
    return handleMyAppointments(store as Parameters<typeof handleMyAppointments>[0], state, text);
  }

  // Falar com humano
  if (parsed.intent === "falar_humano") {
    await dropConv(state.storeId, state.phone);
    const reply = await generateReply(
      "O cliente quer falar com um humano. Avise educadamente que a equipe vai entrar em contato em breve.",
      { storeName: store.name },
    );
    return { reply, aiMessageCounted: true };
  }

  // Agendar — a parte inteligente
  if (parsed.intent === "agendar" && parsed.confidence >= 0.6) {
    return handleAiScheduling(store, state, parsed, services, barbers);
  }

  // IA não entendeu com confiança → retorna null para cair no menu numerado
  if (parsed.intent === "desconhecido" || parsed.confidence < 0.5) {
    return null;
  }

  return null;
}

async function handleAiScheduling(
  store: { id: string; name: string; slug: string },
  state: ConversationState,
  parsed: AiParsedIntent,
  services: { id: string; name: string; price: number; durationMinutes: number }[],
  barbers: { id: string; name: string }[],
): Promise<ChatbotResult> {
  // Encontra serviço pelo nome (fuzzy)
  let service = parsed.serviceName
    ? services.find((s) => s.name.toLowerCase().includes(parsed.serviceName!.toLowerCase()))
    : null;

  // Encontra barbeiro pelo nome (fuzzy)
  let barber = parsed.barberName
    ? barbers.find((b) => b.name.toLowerCase().includes(parsed.barberName!.toLowerCase()))
    : null;

  // Se falta serviço → pede
  if (!service) {
    const list = services
      .map((s, i) => `${i + 1}️⃣ ${s.name} (${formatPrice(s.price)} · ${s.durationMinutes}min)`)
      .join("\n");
    await saveConv({ ...state, step: "choose_service", serviceIds: services.map((s) => s.id) });
    return {
      reply: `Entendi que você quer agendar! ✂️\n\nQual serviço?\n\n${list}\n\n_Digite o número ou o nome do serviço._`,
      aiMessageCounted: true,
    };
  }

  // Se falta barbeiro → pede
  if (!barber) {
    if (barbers.length === 1) {
      barber = barbers[0]; // só tem 1, usa direto
    } else {
      const list = barbers.map((b, i) => `${i + 1}️⃣ ${b.name}`).join("\n");
      await saveConv({
        ...state,
        step: "choose_barber",
        serviceIds: [service.id],
        serviceName: service.name,
      });
      return {
        reply: `*${service.name}* selecionado! 👍\n\nCom qual barbeiro?\n\n${list}\n\n_Digite o número ou o nome._`,
        aiMessageCounted: true,
      };
    }
  }

  // Se falta data → pede
  const dateStr = parsed.date ? parseDateInput(parsed.date) : null;
  if (!dateStr) {
    await saveConv({
      ...state,
      step: "choose_date",
      serviceIds: [service.id],
      serviceName: service.name,
      barberId: barber.id,
      barberName: barber.name,
    });
    return {
      reply: `*${service.name}* com *${barber.name}* ✅\n\nQual dia você prefere?\n\nExemplos: _hoje_, _amanhã_, _segunda_, _15/06_`,
      aiMessageCounted: true,
    };
  }

  // Temos serviço, barbeiro e data — buscar slots
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj < today) {
    await saveConv({
      ...state,
      step: "choose_date",
      serviceIds: [service.id],
      serviceName: service.name,
      barberId: barber.id,
      barberName: barber.name,
    });
    return { reply: "Essa data já passou. Escolha uma data a partir de hoje.", aiMessageCounted: true };
  }

  const slots = await getAvailableSlots({
    barberId: barber.id,
    date: dateObj,
    durationMinutes: service.durationMinutes,
    stepMinutes: 30,
  });

  if (slots.length === 0) {
    await saveConv({
      ...state,
      step: "choose_date",
      serviceIds: [service.id],
      serviceName: service.name,
      barberId: barber.id,
      barberName: barber.name,
    });
    return {
      reply: `Sem horários disponíveis para *${dateObj.toLocaleDateString("pt-BR")}* com ${barber.name} 😕\n\nTente outro dia!`,
      aiMessageCounted: true,
    };
  }

  // Se o cliente especificou um horário, tenta encaixar direto
  if (parsed.time) {
    const requestedTime = normalizeTime(parsed.time);
    if (requestedTime && slots.includes(requestedTime)) {
      // Tem o horário exato! Agenda direto
      return finishBooking(store, state, service, barber, dateStr, requestedTime);
    }
    // Horário não disponível — mostra os disponíveis
    if (requestedTime) {
      const list = slots.map((s, i) => `${i + 1}️⃣ ${s}`).join("\n");
      await saveConv({
        ...state,
        step: "choose_slot",
        serviceIds: [service.id],
        serviceName: service.name,
        barberId: barber.id,
        barberName: barber.name,
        date: dateStr,
        slots,
      });
      return {
        reply: `O horário *${requestedTime}* não está disponível com ${barber.name} em ${dateObj.toLocaleDateString("pt-BR")} 😕\n\nHorários livres:\n\n${list}\n\n_Digite o número._`,
        aiMessageCounted: true,
      };
    }
  }

  // Sem horário especificado — mostra slots
  const list = slots.map((s, i) => `${i + 1}️⃣ ${s}`).join("\n");
  await saveConv({
    ...state,
    step: "choose_slot",
    serviceIds: [service.id],
    serviceName: service.name,
    barberId: barber.id,
    barberName: barber.name,
    date: dateStr,
    slots,
  });

  return {
    reply: `*${service.name}* com *${barber.name}* em *${dateObj.toLocaleDateString("pt-BR")}* 🗓️\n\nHorários disponíveis:\n\n${list}\n\n_Digite o número do horário._`,
    aiMessageCounted: true,
  };
}

/** Normaliza referências de horário: "15h" → "15:00", "15:30" → "15:30" */
function normalizeTime(raw: string): string | null {
  const clean = raw.toLowerCase().trim();

  // "15:00" ou "15:30"
  const match1 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match1) return `${match1[1].padStart(2, "0")}:${match1[2]}`;

  // "15h" ou "15h30"
  const match2 = clean.match(/^(\d{1,2})h(\d{2})?$/);
  if (match2) return `${match2[1].padStart(2, "0")}:${match2[2] || "00"}`;

  return null;
}

/** Finaliza o agendamento (usado tanto pelo fluxo IA quanto menu) */
async function finishBooking(
  store: { id: string; name: string; slug: string },
  state: ConversationState,
  service: { id: string; name: string; price: number; durationMinutes: number },
  barber: { id: string; name: string },
  dateStr: string,
  slot: string,
): Promise<ChatbotResult> {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = slot.split(":").map(Number);
  const startAt = new Date(y, m - 1, d, h, min, 0, 0);
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

  const issue = await checkAvailability({ barberId: barber.id, startAt, endAt });
  if (issue) {
    return { reply: `Esse horário acabou de ser ocupado 😕\nTente outro horário ou mande "oi" para recomeçar.`, aiMessageCounted: true };
  }

  const phoneDigits = state.phone.replace(/\D/g, "");
  let customer = await prisma.customer.findFirst({
    where: { storeId: state.storeId, phone: phoneDigits },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { storeId: state.storeId, name: `WhatsApp ${phoneDigits.slice(-4)}`, phone: phoneDigits },
    });
  }

  const code = await generateAppointmentCode(state.storeId, startAt);
  await prisma.appointment.create({
    data: {
      code, storeId: state.storeId, customerId: customer.id, barberId: barber.id,
      startAt, endAt, status: "SCHEDULED", source: "PUBLIC", total: service.price, discount: 0,
      services: { create: [{ serviceId: service.id, price: service.price, durationMinutes: service.durationMinutes }] },
    },
  });

  await dropConv(state.storeId, state.phone);

  const dateFormatted = startAt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  const reply = await generateReply(
    `Confirme o agendamento de forma simpática. Dados: ${service.name} com ${barber.name}, ${dateFormatted} às ${slot}, ${formatPrice(service.price)}, código ${code}. Diga que para cancelar é só mandar "cancelar" e para novo agendamento mandar "oi".`,
    { storeName: store.name },
  );

  return { reply, aiMessageCounted: true };
}

// ── Step handlers (menu numerado — fallback) ─────

async function handleMenu(
  store: { id: string; name: string },
  state: ConversationState,
): Promise<ChatbotResult> {
  await saveConv({ ...state, step: "choose_service" });

  const services = await prisma.service.findMany({
    where: { storeId: store.id, isActive: true },
    select: { id: true, name: true, price: true, durationMinutes: true },
    orderBy: { name: "asc" },
  });

  if (services.length === 0) {
    await dropConv(state.storeId, state.phone);
    return {
      reply: `Olá! A *${store.name}* ainda não configurou serviços. Entre em contato diretamente.`,
      aiMessageCounted: true,
    };
  }

  const list = services
    .map((s, i) => `${i + 1}️⃣ ${s.name} (${formatPrice(s.price)} · ${s.durationMinutes}min)`)
    .join("\n");

  // Salva mapeamento para usar no próximo passo
  await saveConv({
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
    await dropConv(state.storeId, state.phone);
    return { reply: "Nenhum barbeiro disponível no momento. Tente novamente mais tarde.", aiMessageCounted: true };
  }

  const list = barbers
    .map((b, i) => `${i + 1}️⃣ ${b.name}`)
    .join("\n");

  await saveConv({
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

  await saveConv({
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
    await dropConv(state.storeId, state.phone);
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

  await saveConv({
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
    await dropConv(state.storeId, state.phone);
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
    await dropConv(state.storeId, state.phone);
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

  await dropConv(state.storeId, state.phone);

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
    await dropConv(state.storeId, state.phone);
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

  await dropConv(state.storeId, state.phone);

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
