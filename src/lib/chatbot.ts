import { prisma } from "@/lib/prisma";
import { getAvailableSlots, checkAvailability, generateAppointmentCode } from "@/lib/scheduling";
import { limitsFor } from "@/lib/plan-limits";
import { parseIntent, isAiEnabled, generateReply, type AiParsedIntent } from "@/lib/ai-chatbot";
import { notifySubscriptionInterest } from "@/lib/notifications";

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
  | "ask_name"
  | "my_appointments"
  | "cancel_select"
  | "sub_club";

interface ConversationState {
  step: ConversationStep;
  storeId: string;
  convKey: string; // chave estável da conversa (remoteJid) — usada para load/save/drop
  phone: string;   // telefone real do cliente (para cadastro) — pode ser vazio até resolver
  serviceIds?: string[];
  serviceName?: string;
  barberId?: string;
  barberName?: string;
  date?: string; // YYYY-MM-DD
  slots?: string[]; // HH:mm[]
  pendingSlot?: string; // horário escolhido aguardando o nome do cliente
  cancelIds?: string[]; // ids de agendamentos oferecidos para cancelar
  updatedAt: number;
}

// Estado persistido no banco (tabela chatbot_conversations).
// Em serverless a memória não é compartilhada entre instâncias, então
// cada mensagem é carregada/salva no banco para a conversa não "resetar".

async function loadConv(storeId: string, convKey: string): Promise<ConversationState> {
  const row = await prisma.chatbotConversation.findUnique({
    where: { storeId_phone: { storeId, phone: convKey } },
  });
  if (!row) return { step: "menu", storeId, convKey, phone: "", updatedAt: Date.now() };
  const data = (row.data ?? {}) as unknown as Partial<ConversationState>;
  return {
    step: row.step as ConversationStep,
    storeId,
    convKey,
    phone: data.phone || "",
    serviceIds: data.serviceIds,
    serviceName: data.serviceName,
    barberId: data.barberId,
    barberName: data.barberName,
    date: data.date,
    slots: data.slots,
    pendingSlot: data.pendingSlot,
    cancelIds: data.cancelIds,
    updatedAt: row.updatedAt.getTime(),
  };
}

async function saveConv(state: ConversationState) {
  const { storeId, convKey, step } = state;
  const data = {
    phone: state.phone ?? null,
    serviceIds: state.serviceIds ?? null,
    serviceName: state.serviceName ?? null,
    barberId: state.barberId ?? null,
    barberName: state.barberName ?? null,
    date: state.date ?? null,
    slots: state.slots ?? null,
    pendingSlot: state.pendingSlot ?? null,
    cancelIds: state.cancelIds ?? null,
  };
  await prisma.chatbotConversation.upsert({
    where: { storeId_phone: { storeId, phone: convKey } },
    create: { storeId, phone: convKey, step, data },
    update: { step, data },
  });
}

async function dropConv(storeId: string, convKey: string) {
  await prisma.chatbotConversation.deleteMany({ where: { storeId, phone: convKey } });
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

/** Seleciona um item por número (1-based) OU por nome (fuzzy). */
function pickByNumberOrName<T extends { name: string }>(text: string, items: T[]): T | null {
  const t = text.trim();
  const n = parseInt(t);
  if (!isNaN(n) && n >= 1 && n <= items.length) return items[n - 1];
  const lower = t.toLowerCase();
  if (lower.length < 2) return null;
  return (
    items.find((it) => it.name.toLowerCase().includes(lower)) ||
    items.find((it) => lower.includes(it.name.toLowerCase())) ||
    null
  );
}

/** Junta itens em linguagem natural: "a, b ou c". */
function naturalJoin(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ou ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} ou ${items[items.length - 1]}`;
}

/** "09:00" → "9h", "14:30" → "14h30". */
function slotNatural(s: string): string {
  const [h, m] = s.split(":");
  const hh = parseInt(h);
  return m === "00" ? `${hh}h` : `${hh}h${m}`;
}

/** Escolhe um horário a partir de uma frase ("13h perfeito", "pode ser 14:30",
 *  "às 10") ou pelo índice. Procura o padrão de hora em qualquer lugar do texto. */
function pickSlot(text: string, slots: string[]): string | null {
  const t = text.toLowerCase();

  // Padrões de hora, do mais específico ao mais genérico
  const patterns: RegExp[] = [
    /(\d{1,2})[:h](\d{2})/,        // 14:30 ou 14h30
    /(\d{1,2})\s*h\b/,             // 13h
    /\b(\d{1,2})\s*horas?\b/,     // 13 horas
    /\b(?:[àa]s?)\s*(\d{1,2})\b/, // às 13 / as 13 / a 13
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const hh = parseInt(m[1]).toString().padStart(2, "0");
      const mm = (m[2] || "00").padStart(2, "0");
      const hm = `${hh}:${mm}`;
      if (slots.includes(hm)) return hm;
    }
  }

  // Número puro: pode ser hora cheia (10 → 10:00) ou índice da lista
  const bare = t.trim().match(/^(\d{1,2})$/);
  if (bare) {
    const n = parseInt(bare[1]);
    const asTime = `${n.toString().padStart(2, "0")}:00`;
    if (slots.includes(asTime)) return asTime;
    if (n >= 1 && n <= slots.length) return slots[n - 1];
  }
  return null;
}

/** Link público de agendamento da loja (fallback quando o bot não entende). */
function bookingLink(slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://korta.vercel.app";
  return `${base}/agendar/${slug}`;
}

/** Detecta perguntas frequentes (FAQ) para responder sem perder o fluxo. */
function detectFaq(lower: string): "address" | "contact" | "hours" | null {
  if (/(endere|onde fica|onde é|onde e|localiza|como cheg|fica onde)/.test(lower)) return "address";
  if (/(funcionamento|que horas|hor[áa]rio de|abre|fecha|aberto)/.test(lower)) return "hours";
  if (/(telefone|contato|whats|qual.*n[uú]mero)/.test(lower)) return "contact";
  return null;
}

// ── Main handler ─────────────────────────────────
export interface ChatbotResult {
  reply: string;
  aiMessageCounted: boolean; // true = conta no limite do plano
}

export async function handleIncomingMessage(
  storeId: string,
  convKey: string,
  phone: string,
  text: string,
): Promise<ChatbotResult> {
  // Carrega dados da loja
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, slug: true, plan: true, address: true, phone: true },
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
    await dropConv(storeId, convKey);
  }

  const state = await loadConv(storeId, convKey);
  // Telefone real do cliente: atualiza só quando veio resolvido nesta
  // mensagem; senão mantém o já guardado (não rebaixa). Último recurso
  // pro cadastro é o próprio convKey.
  if (phone) state.phone = phone;
  if (!state.phone) state.phone = convKey;

  // ── FAQ: responde perguntas comuns sem perder o passo atual ──
  const faq = detectFaq(lower);
  if (faq === "address") {
    const inFlow = state.step !== "menu";
    const addr = store.address
      ? `📍 Nosso endereço:\n${store.address}\nhttps://maps.google.com/?q=${encodeURIComponent(store.address)}`
      : "Ainda não temos endereço cadastrado aqui. Me chama que te passo!";
    return {
      reply: inFlow ? `${addr}\n\n_Pode continuar de onde parou. 😉_` : addr,
      aiMessageCounted: true,
    };
  }
  if (faq === "contact") {
    const inFlow = state.step !== "menu";
    const ph = store.phone
      ? `📞 Contato: ${store.phone}`
      : "Você já está falando com a gente por aqui! 😊";
    return {
      reply: inFlow ? `${ph}\n\n_Pode continuar de onde parou. 😉_` : ph,
      aiMessageCounted: true,
    };
  }
  if (faq === "hours") {
    const inFlow = state.step !== "menu";
    const msg = "Nossos horários variam por barbeiro e por dia 😊\nMe diz o dia que você quer que eu mostro os horários livres na hora!";
    return {
      reply: inFlow ? `${msg}\n\n_Pode continuar de onde parou._` : `${msg}\n\nMande *oi* para agendar.`,
      aiMessageCounted: true,
    };
  }

  // ── Comando global: cancelar agendamento ──
  if (lower === "cancelar" || lower === "desmarcar") {
    return handleCancelStart(store, state);
  }

  // Se está no passo de seleção de cancelamento, trata aqui
  if (state.step === "cancel_select") {
    return handleCancelSelect(store, state, text);
  }

  // ── Clube de assinatura ──
  if (state.step === "sub_club") {
    return handleSubClub(store, state, text);
  }
  if (/(assinar|assinatura|clube|plano mensal|mensalidade|ser membro|vip)/.test(lower)) {
    return handleSubscriptionStart(store, state);
  }

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
    case "ask_name":
      return handleAskName(store, state, text);
    case "my_appointments":
      return handleMyAppointments(store, state, text);
    default:
      await dropConv(storeId, convKey);
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
    await dropConv(state.storeId, state.convKey);
    const reply = await generateReply(
      "O cliente quer falar com um humano. Avise educadamente que a equipe vai entrar em contato em breve.",
      { storeName: store.name },
    );
    return { reply, aiMessageCounted: true };
  }

  // Cancelar agendamento
  if (parsed.intent === "cancelar") {
    return handleCancelStart(store, state);
  }

  // Clube de assinatura
  if (parsed.intent === "assinar") {
    return handleSubscriptionStart(store, state);
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
  const service = parsed.serviceName
    ? services.find((s) => s.name.toLowerCase().includes(parsed.serviceName!.toLowerCase()))
    : null;

  // Encontra barbeiro pelo nome (fuzzy)
  let barber = parsed.barberName
    ? barbers.find((b) => b.name.toLowerCase().includes(parsed.barberName!.toLowerCase()))
    : null;

  // Se falta serviço → pede
  if (!service) {
    const opts = naturalJoin(services.map((s) => `*${s.name}* (${formatPrice(s.price)})`));
    await saveConv({ ...state, step: "choose_service", serviceIds: services.map((s) => s.id) });
    return {
      reply: `Bora agendar! ✂️ O que você quer fazer? Temos ${opts}.`,
      aiMessageCounted: true,
    };
  }

  // Se falta barbeiro → pede
  if (!barber) {
    if (barbers.length === 1) {
      barber = barbers[0]; // só tem 1, usa direto
    } else {
      const nomes = naturalJoin(barbers.map((b) => `*${b.name}*`));
      await saveConv({
        ...state,
        step: "choose_barber",
        serviceIds: [service.id],
        serviceName: service.name,
      });
      return {
        reply: `Boa, *${service.name}*! 👍 Com quem você prefere — ${nomes}? (ou "tanto faz")`,
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
      reply: `Fechou: *${service.name}* com *${barber.name}*! 📅 Que dia fica bom — _hoje_, _amanhã_, _sexta_ ou uma data tipo _15/06_?`,
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
      reply: `Poxa, o *${barber.name}* não tem horário em ${dateObj.toLocaleDateString("pt-BR")} 😕 Quer tentar outro dia?`,
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
      const horarios = naturalJoin(slots.map(slotNatural));
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
        reply: `O ${slotNatural(requestedTime)} já foi nesse dia 😕 Mas o *${barber.name}* tem: ${horarios}. Qual rola?`,
        aiMessageCounted: true,
      };
    }
  }

  // Sem horário especificado — mostra slots
  const horarios = naturalJoin(slots.map(slotNatural));
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
    reply: `Pra *${dateObj.toLocaleDateString("pt-BR")}* o *${barber.name}* tem: ${horarios}. Qual horário fica melhor? 🕐`,
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

/** Finaliza o agendamento da rota IA — delega para finalizeBooking, que
 *  pergunta o nome se for cliente novo e confirma. */
async function finishBooking(
  store: { id: string; name: string; slug: string },
  state: ConversationState,
  service: { id: string; name: string; price: number; durationMinutes: number },
  barber: { id: string; name: string },
  dateStr: string,
  slot: string,
): Promise<ChatbotResult> {
  return finalizeBooking(store, state, service, barber.id, barber.name, dateStr, slot);
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
    await dropConv(state.storeId, state.convKey);
    return {
      reply: `Olá! A *${store.name}* ainda não configurou serviços. Entre em contato diretamente.`,
      aiMessageCounted: true,
    };
  }

  const opts = naturalJoin(services.map((s) => `*${s.name}* (${formatPrice(s.price)})`));

  // Salva mapeamento para usar no próximo passo
  await saveConv({
    ...state,
    step: "choose_service",
    serviceIds: services.map((s) => s.id),
  });

  return {
    reply: `Olá! Seja bem-vindo à *${store.name}* ✂️\n\nO que você gostaria de fazer hoje? Temos ${opts}. É só me dizer 😊`,
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

  let selected = pickByNumberOrName(text, services);
  // IA de reserva: se o match literal falhar, deixa a IA interpretar
  // ("corte e barba", "só o cabelo", "fazer a barba", etc.)
  if (!selected && isAiEnabled()) {
    const parsed = await parseIntent(text, { storeName: store.name, services: services.map((s) => s.name), barbers: [] });
    if (parsed.serviceName) {
      const sn = parsed.serviceName.toLowerCase();
      selected =
        services.find((s) => s.name.toLowerCase().includes(sn)) ||
        services.find((s) => sn.includes(s.name.toLowerCase())) ||
        null;
    }
  }
  if (!selected) {
    const opts = naturalJoin(services.map((s) => `*${s.name}*`));
    return { reply: `Hmm, não peguei qual serviço 😅 Temos ${opts}. Qual você quer?`, aiMessageCounted: true };
  }

  // Carrega barbeiros
  const barbers = await prisma.barber.findMany({
    where: { storeId: store.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (barbers.length === 0) {
    await dropConv(state.storeId, state.convKey);
    return { reply: "Nenhum barbeiro disponível no momento. Tente novamente mais tarde.", aiMessageCounted: true };
  }

  await saveConv({
    ...state,
    step: "choose_barber",
    serviceIds: [selected.id],
    serviceName: selected.name,
  });

  const nomes = naturalJoin(barbers.map((b) => `*${b.name}*`));
  const comQuem = barbers.length === 1
    ? `Vai ser com o *${barbers[0].name}*.`
    : `Com quem você prefere — ${nomes}? (ou diz "tanto faz" que eu escolho)`;

  return {
    reply: `Boa escolha, *${selected.name}*! 👍\n\n${comQuem}`,
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

  // "tanto faz" / "qualquer" → escolhe o primeiro barbeiro
  const lower = text.toLowerCase().trim();
  const anyBarber = /(tanto faz|qualquer|qualquer um|voc[eê] escolhe|pode ser qualquer|n[ãa]o importa)/.test(lower);

  let selected = anyBarber ? barbers[0] : pickByNumberOrName(text, barbers);
  // IA de reserva: interpreta apelidos/variações do nome do barbeiro
  if (!selected && isAiEnabled()) {
    const parsed = await parseIntent(text, { storeName: store.name, services: [], barbers: barbers.map((b) => b.name) });
    if (parsed.barberName) {
      const bn = parsed.barberName.toLowerCase();
      selected =
        barbers.find((b) => b.name.toLowerCase().includes(bn)) ||
        barbers.find((b) => bn.includes(b.name.toLowerCase())) ||
        null;
    }
  }
  if (!selected) {
    const nomes = naturalJoin(barbers.map((b) => `*${b.name}*`));
    return { reply: `Hmm, não achei esse barbeiro 😅 Pode ser com ${nomes}. Qual você prefere? (ou diz "tanto faz")`, aiMessageCounted: true };
  }

  await saveConv({
    ...state,
    step: "choose_date",
    barberId: selected.id,
    barberName: selected.name,
  });

  const intro = anyBarber ? `Beleza, vou deixar com o *${selected.name}*!` : `Fechou com o *${selected.name}*!`;
  return {
    reply: `${intro} 📅\n\nQue dia fica bom pra você? Pode dizer _hoje_, _amanhã_, _sexta_ ou uma data tipo _15/06_.`,
    aiMessageCounted: true,
  };
}

async function handleChooseDate(
  store: { id: string; name: string; slug: string },
  state: ConversationState,
  text: string,
): Promise<ChatbotResult> {
  const dateStr = parseDateInput(text);
  if (!dateStr) {
    // Não é uma data — ajuda listando os próximos dias com vaga do barbeiro
    if (state.barberId && state.serviceIds?.length) {
      const svc = await prisma.service.findUnique({
        where: { id: state.serviceIds[0] },
        select: { durationMinutes: true },
      });
      const dur = svc?.durationMinutes || 30;
      const wd = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
      const base = new Date();
      const dias: string[] = [];
      for (let i = 0; i < 14 && dias.length < 6; i++) {
        const dd = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
        const slots = await getAvailableSlots({ barberId: state.barberId, date: dd, durationMinutes: dur, stepMinutes: 30 });
        if (slots.length > 0) {
          const label =
            i === 0 ? "hoje" :
            i === 1 ? "amanhã" :
            `${wd[dd.getDay()]} ${dd.getDate().toString().padStart(2, "0")}/${(dd.getMonth() + 1).toString().padStart(2, "0")}`;
          dias.push(label);
        }
      }
      if (dias.length > 0) {
        return {
          reply: `*${state.barberName}* tem vaga nesses dias:\n\n${dias.map((d) => `• ${d}`).join("\n")}\n\nQual você prefere? (ou digite uma data como _15/06_)`,
          aiMessageCounted: true,
        };
      }
    }
    return {
      reply: `Não peguei o dia 😅 Pode dizer _hoje_, _amanhã_, _sexta_ ou uma data tipo _15/06_.\n\nOu, se preferir, agende direto pelo site:\n${bookingLink(store.slug)}`,
      aiMessageCounted: true,
    };
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
    await dropConv(state.storeId, state.convKey);
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
      reply: `Poxa, o *${state.barberName}* não tem horário livre em ${dateObj.toLocaleDateString("pt-BR")} 😕\nQuer tentar outro dia?`,
      aiMessageCounted: true,
    };
  }

  const horarios = naturalJoin(slots.map(slotNatural));

  await saveConv({
    ...state,
    step: "choose_slot",
    date: dateStr,
    slots,
  });

  return {
    reply: `Pra *${dateObj.toLocaleDateString("pt-BR")}* o *${state.barberName}* tem: ${horarios}.\n\nQual horário fica melhor pra você?`,
    aiMessageCounted: true,
  };
}

async function handleChooseSlot(
  store: { id: string; name: string; slug: string },
  state: ConversationState,
  text: string,
): Promise<ChatbotResult> {
  if (!state.slots || !state.date || !state.barberId || !state.serviceIds?.length) {
    await dropConv(state.storeId, state.convKey);
    return { reply: "Sessão expirada. Mande qualquer mensagem para recomeçar.", aiMessageCounted: true };
  }

  const selectedSlot = pickSlot(text, state.slots);
  if (!selectedSlot) {
    const horarios = naturalJoin(state.slots.map(slotNatural));
    return {
      reply: `Hmm, não consegui identificar o horário 😅 Os disponíveis são: ${horarios}.\n\nÉ só me dizer um deles. Se preferir, você também pode agendar direto pelo site:\n${bookingLink(store.slug)}`,
      aiMessageCounted: true,
    };
  }

  // Busca serviço para duração e preço
  const service = await prisma.service.findUnique({
    where: { id: state.serviceIds[0] },
    select: { id: true, name: true, price: true, durationMinutes: true },
  });

  if (!service) {
    await dropConv(state.storeId, state.convKey);
    return { reply: "Serviço não encontrado. Mande qualquer mensagem para recomeçar.", aiMessageCounted: true };
  }

  return finalizeBooking(store, state, service, state.barberId, state.barberName || "", state.date, selectedSlot);
}

// ── Finalização do agendamento (centralizada) ─────
// Verifica disponibilidade; se for cliente novo (sem nome real), pergunta o
// nome antes de confirmar; senão, agenda direto.

interface BookingService {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

async function finalizeBooking(
  store: { id: string; name: string; slug: string },
  state: ConversationState,
  service: BookingService,
  barberId: string,
  barberName: string,
  dateStr: string,
  slot: string,
): Promise<ChatbotResult> {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = slot.split(":").map(Number);
  const startAt = new Date(y, m - 1, d, h, min, 0, 0);
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

  const issue = await checkAvailability({ barberId, startAt, endAt });
  if (issue) {
    return { reply: `Esse horário acabou de ser ocupado 😕 Quer tentar outro?`, aiMessageCounted: true };
  }

  const phoneDigits = state.phone.replace(/\D/g, "");
  const customer = await prisma.customer.findFirst({
    where: { storeId: store.id, phone: phoneDigits },
  });
  const hasRealName = customer && customer.name && !customer.name.startsWith("WhatsApp ");

  // Cliente novo (ou sem nome): pergunta o nome antes de confirmar
  if (!hasRealName) {
    await saveConv({
      ...state,
      step: "ask_name",
      serviceIds: [service.id],
      serviceName: service.name,
      barberId,
      barberName,
      date: dateStr,
      pendingSlot: slot,
    });
    return { reply: "Boa! 🙌 Pra finalizar, como é o seu nome?", aiMessageCounted: true };
  }

  return commitBooking(store, state, service, barberId, barberName, customer!.id, startAt, endAt, slot);
}

async function commitBooking(
  store: { id: string; name: string; slug: string },
  state: ConversationState,
  service: BookingService,
  barberId: string,
  barberName: string,
  customerId: string,
  startAt: Date,
  endAt: Date,
  slot: string,
): Promise<ChatbotResult> {
  const code = await generateAppointmentCode(store.id, startAt);
  const appointment = await prisma.appointment.create({
    data: {
      code,
      storeId: store.id,
      customerId,
      barberId,
      startAt,
      endAt,
      status: "SCHEDULED",
      source: "PUBLIC",
      total: service.price,
      discount: 0,
      services: {
        create: [{ serviceId: service.id, price: service.price, durationMinutes: service.durationMinutes }],
      },
    },
  });

  await dropConv(state.storeId, state.convKey);

  const dateFormatted = startAt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return {
    reply: `Prontinho, tá agendado! ✅\n\n📅 ${dateFormatted} às ${slotNatural(slot)}\n✂️ ${service.name}\n💈 ${barberName}\n💰 ${formatPrice(service.price)}\n🔐 Código: ${appointment.code}\n\nQualquer coisa é só mandar *cancelar*. Te espero! 😄`,
    aiMessageCounted: true,
  };
}

async function handleAskName(
  store: { id: string; name: string; slug: string },
  state: ConversationState,
  text: string,
): Promise<ChatbotResult> {
  const name = text.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60 || /^\d+$/.test(name)) {
    return { reply: "Como posso te chamar? Me diz seu nome 😊", aiMessageCounted: true };
  }

  if (!state.serviceIds?.length || !state.barberId || !state.date || !state.pendingSlot) {
    await dropConv(state.storeId, state.convKey);
    return { reply: "A conversa expirou 😅 Manda *oi* que recomeçamos rapidinho!", aiMessageCounted: true };
  }

  // Cria/atualiza o cliente com o nome informado
  const phoneDigits = state.phone.replace(/\D/g, "");
  const existing = await prisma.customer.findFirst({
    where: { storeId: store.id, phone: phoneDigits },
  });
  let customerId: string;
  if (existing) {
    await prisma.customer.update({ where: { id: existing.id }, data: { name } });
    customerId = existing.id;
  } else {
    const created = await prisma.customer.create({
      data: { storeId: store.id, phone: phoneDigits, name },
    });
    customerId = created.id;
  }

  const service = await prisma.service.findUnique({
    where: { id: state.serviceIds[0] },
    select: { id: true, name: true, price: true, durationMinutes: true },
  });
  if (!service) {
    await dropConv(state.storeId, state.convKey);
    return { reply: "Ops, não achei o serviço. Manda *oi* pra recomeçar.", aiMessageCounted: true };
  }

  const [y, m, d] = state.date.split("-").map(Number);
  const [h, mi] = state.pendingSlot.split(":").map(Number);
  const startAt = new Date(y, m - 1, d, h, mi, 0, 0);
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

  // Revalida disponibilidade (pode ter sido ocupado enquanto pedíamos o nome)
  const issue = await checkAvailability({ barberId: state.barberId, startAt, endAt });
  if (issue) {
    await dropConv(state.storeId, state.convKey);
    return { reply: `Ah ${name}, esse horário acabou de ser ocupado 😕 Manda *oi* que a gente acha outro!`, aiMessageCounted: true };
  }

  return commitBooking(store, state, service, state.barberId, state.barberName || "", customerId, startAt, endAt, state.pendingSlot);
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
    await dropConv(state.storeId, state.convKey);
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

  await dropConv(state.storeId, state.convKey);

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
    reply: `*Seus próximos agendamentos:*\n\n${list}\n\nPara cancelar, mande *cancelar*. Para novo agendamento, mande *oi*.`,
    aiMessageCounted: true,
  };
}

// ── Cancelamento ─────────────────────────────────

async function handleCancelStart(
  store: { id: string; name: string },
  state: ConversationState,
): Promise<ChatbotResult> {
  const phoneDigits = state.phone.replace(/\D/g, "");
  const customer = await prisma.customer.findFirst({
    where: { storeId: store.id, phone: phoneDigits },
    select: { id: true },
  });

  if (!customer) {
    await dropConv(state.storeId, state.convKey);
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

  if (upcoming.length === 0) {
    await dropConv(state.storeId, state.convKey);
    return { reply: "Você não tem agendamentos futuros para cancelar. Mande *oi* para agendar!", aiMessageCounted: true };
  }

  const list = upcoming
    .map((a, i) => {
      const dt = new Date(a.startAt);
      const hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return `${i + 1}️⃣ ${dt.toLocaleDateString("pt-BR")} ${hora} — ${a.services.map((s) => s.service.name).join(", ")} com ${a.barber.name}`;
    })
    .join("\n");

  await saveConv({ ...state, step: "cancel_select", cancelIds: upcoming.map((a) => a.id) });

  return {
    reply: `Qual agendamento você quer cancelar?\n\n${list}\n\n_Digite o número ou "0" para voltar._`,
    aiMessageCounted: true,
  };
}

async function handleCancelSelect(
  store: { id: string; name: string },
  state: ConversationState,
  text: string,
): Promise<ChatbotResult> {
  if (!state.cancelIds || state.cancelIds.length === 0) {
    await dropConv(state.storeId, state.convKey);
    return { reply: "Sessão expirada. Mande *cancelar* novamente.", aiMessageCounted: true };
  }

  const choice = parseInt(text.trim());
  if (isNaN(choice) || choice < 1 || choice > state.cancelIds.length) {
    return { reply: `Opção inválida. Digite de 1 a ${state.cancelIds.length}, ou "0" para voltar.`, aiMessageCounted: true };
  }

  const apptId = state.cancelIds[choice - 1];
  const appt = await prisma.appointment.findFirst({
    where: { id: apptId, storeId: store.id },
    include: {
      barber: { select: { name: true } },
      services: { include: { service: { select: { name: true } } } },
    },
  });

  if (!appt || (appt.status !== "SCHEDULED" && appt.status !== "CONFIRMED")) {
    await dropConv(state.storeId, state.convKey);
    return { reply: "Esse agendamento não está mais ativo. Mande *oi* para agendar.", aiMessageCounted: true };
  }

  await prisma.appointment.update({
    where: { id: apptId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: "Cancelado pelo cliente via WhatsApp",
    },
  });

  await dropConv(state.storeId, state.convKey);

  const dt = new Date(appt.startAt);
  const hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return {
    reply: `Agendamento cancelado ✅\n\n📅 ${dt.toLocaleDateString("pt-BR")} às ${hora}\n✂️ ${appt.services.map((s) => s.service.name).join(", ")}\n💈 ${appt.barber.name}\n\nMande *oi* se quiser agendar novamente.`,
    aiMessageCounted: true,
  };
}

// ── Clube de assinatura ──────────────────────────

async function handleSubscriptionStart(
  store: { id: string; name: string },
  state: ConversationState,
): Promise<ChatbotResult> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { storeId: store.id, isActive: true },
    include: { services: { include: { service: { select: { name: true } } } } },
    orderBy: { priceInCents: "asc" },
  });

  if (plans.length === 0) {
    await dropConv(state.storeId, state.convKey);
    return {
      reply: "No momento não temos clube de assinatura por aqui 😅 Mas posso te ajudar a agendar um horário! É só mandar *oi*.",
      aiMessageCounted: true,
    };
  }

  const lista = plans
    .map((p) => {
      const usos = p.maxUsesPerMonth ? `${p.maxUsesPerMonth} usos/mês` : "uso ilimitado";
      const inclui = p.services.map((s) => s.service.name).join(", ");
      return `*${p.name}* — ${formatPrice(p.priceInCents / 100)}/mês\n  _${usos}${inclui ? ` · ${inclui}` : ""}_`;
    })
    .join("\n\n");

  await saveConv({ ...state, step: "sub_club" });

  return {
    reply: `Que ótimo que quer fazer parte! 🌟 Nossos planos:\n\n${lista}\n\nQual deles te interessa? (me diz o nome do plano)`,
    aiMessageCounted: true,
  };
}

async function handleSubClub(
  store: { id: string; name: string },
  state: ConversationState,
  text: string,
): Promise<ChatbotResult> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { storeId: store.id, isActive: true },
    orderBy: { priceInCents: "asc" },
  });

  const selected = pickByNumberOrName(text, plans);
  if (!selected) {
    const nomes = naturalJoin(plans.map((p) => p.name));
    return { reply: `Não achei esse plano 😅 Temos: ${nomes}. Qual você quer?`, aiMessageCounted: true };
  }

  // Busca o nome do cliente (se já cadastrado) para a notificação
  const phoneDigits = state.phone.replace(/\D/g, "");
  const customer = await prisma.customer.findFirst({
    where: { storeId: store.id, phone: phoneDigits },
    select: { name: true },
  });
  const realName = customer?.name && !customer.name.startsWith("WhatsApp ") ? customer.name : null;

  // Avisa o dono da loja por e-mail (best-effort, não bloqueia a resposta)
  await notifySubscriptionInterest({
    storeId: store.id,
    customerName: realName,
    customerPhone: phoneDigits,
    planName: selected.name,
    planPriceCents: selected.priceInCents,
  }).catch(() => {});

  await dropConv(state.storeId, state.convKey);

  return {
    reply: `Show! 🎉 Anotei seu interesse no plano *${selected.name}* (${formatPrice(selected.priceInCents / 100)}/mês).\n\nA equipe da *${store.name}* vai te chamar pra combinar o pagamento e ativar sua assinatura. 😊\n\nEnquanto isso, posso te ajudar a agendar — é só mandar *oi*!`,
    aiMessageCounted: true,
  };
}
