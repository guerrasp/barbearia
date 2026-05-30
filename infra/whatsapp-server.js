/**
 * WhatsApp Multi-Session Server (Baileys)
 * Cada store tem sua própria sessão/conexão WhatsApp.
 *
 * Endpoints:
 *   POST   /session/:storeId/start     → inicia sessão, gera QR
 *   GET    /session/:storeId/qr        → retorna QR code atual (base64)
 *   GET    /session/:storeId/status    → { connected, phone }
 *   DELETE /session/:storeId           → desconecta e remove sessão
 *   POST   /send/:storeId             → envia mensagem { phone, text }
 *   GET    /status                     → health check geral
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const http = require("http");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const AUTH_BASE = "/app/auth";
const API_KEY = process.env.WHATSAPP_API_KEY;
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "";

if (!API_KEY) {
  console.error("FATAL: WHATSAPP_API_KEY é obrigatória. Defina no ambiente.");
  process.exit(1);
}

// ── Sessions map ──────────────────────────────────────────────
// sessions[storeId] = { sock, qr, connected, phone, connecting }
const sessions = {};

function getSession(storeId) {
  return sessions[storeId] || null;
}

// ── Baileys connect ───────────────────────────────────────────
async function startSession(storeId) {
  if (sessions[storeId]?.connecting) return;
  if (sessions[storeId]?.connected) return;

  const authDir = path.join(AUTH_BASE, storeId);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const session = {
    sock: null,
    qr: null,
    connected: false,
    phone: null,
    connecting: true,
  };
  sessions[storeId] = session;

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ["Korta", "Chrome", "120.0"],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
  });

  session.sock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr: qrCode } = update;

    if (qrCode) {
      // Gera QR code como base64 PNG
      QRCode.toDataURL(qrCode, { width: 300, margin: 2 })
        .then((url) => {
          session.qr = url;
          console.log(`[${storeId}] QR code gerado`);
        })
        .catch((e) => console.error(`[${storeId}] Erro QR:`, e));
    }

    if (connection === "close") {
      session.connected = false;
      session.connecting = false;
      session.phone = null;
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log(`[${storeId}] Deslogado — removendo credenciais`);
        // Remove auth para forçar novo QR na próxima conexão
        try {
          fs.rmSync(authDir, { recursive: true, force: true });
        } catch {}
        delete sessions[storeId];
      } else {
        console.log(`[${storeId}] Desconectado (${reason}) — reconectando...`);
        setTimeout(() => startSession(storeId), 3000);
      }
    }

    if (connection === "open") {
      session.connected = true;
      session.connecting = false;
      session.qr = null;
      // Extrai número do telefone conectado
      const me = sock.user;
      session.phone = me?.id?.split(":")[0] || me?.id?.split("@")[0] || null;
      console.log(`[${storeId}] Conectado! Telefone: ${session.phone}`);
    }
  });
}

// ── Inicializa sessões existentes ao boot ─────────────────────
async function bootExistingSessions() {
  if (!fs.existsSync(AUTH_BASE)) {
    fs.mkdirSync(AUTH_BASE, { recursive: true });
    return;
  }
  const dirs = fs.readdirSync(AUTH_BASE).filter((d) => {
    return fs.statSync(path.join(AUTH_BASE, d)).isDirectory();
  });
  console.log(`Restaurando ${dirs.length} sessão(ões)...`);
  for (const storeId of dirs) {
    try {
      await startSession(storeId);
    } catch (e) {
      console.error(`Erro ao restaurar sessão ${storeId}:`, e.message);
    }
  }
}

// ── Auth middleware ───────────────────────────────────────────
function checkAuth(req, res) {
  const auth = req.headers["x-api-key"];
  if (auth !== API_KEY) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return false;
  }
  return true;
}

// ── HTTP helpers ──────────────────────────────────────────────
function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
  });
}

function parseUrl(url) {
  // /session/:storeId/action ou /send/:storeId
  const parts = url.split("?")[0].split("/").filter(Boolean);
  return parts;
}

// ── HTTP Server ───────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
    });
    return res.end();
  }

  if (!checkAuth(req, res)) return;

  const parts = parseUrl(req.url);

  // GET /status — health check
  if (req.method === "GET" && parts.length === 1 && parts[0] === "status") {
    const active = Object.entries(sessions)
      .filter(([, s]) => s.connected)
      .map(([id, s]) => ({ storeId: id, phone: s.phone }));
    return json(res, 200, { ok: true, activeSessions: active.length, sessions: active });
  }

  // POST /session/:storeId/start
  if (req.method === "POST" && parts[0] === "session" && parts[2] === "start") {
    const storeId = parts[1];
    if (!storeId) return json(res, 400, { error: "storeId obrigatório" });
    try {
      await startSession(storeId);
      return json(res, 200, { ok: true, message: "Sessão iniciada" });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  // GET /session/:storeId/qr
  if (req.method === "GET" && parts[0] === "session" && parts[2] === "qr") {
    const storeId = parts[1];
    const session = getSession(storeId);
    if (!session) return json(res, 404, { error: "Sessão não encontrada. Inicie primeiro." });
    if (session.connected) return json(res, 200, { connected: true, qr: null });
    return json(res, 200, { connected: false, qr: session.qr });
  }

  // GET /session/:storeId/status
  if (req.method === "GET" && parts[0] === "session" && parts[2] === "status") {
    const storeId = parts[1];
    const session = getSession(storeId);
    if (!session) return json(res, 200, { connected: false, phone: null, exists: false });
    return json(res, 200, {
      connected: session.connected,
      phone: session.phone,
      connecting: session.connecting,
      hasQr: !!session.qr,
      exists: true,
    });
  }

  // DELETE /session/:storeId
  if (req.method === "DELETE" && parts[0] === "session" && parts[1]) {
    const storeId = parts[1];
    const session = getSession(storeId);
    if (session?.sock) {
      try {
        await session.sock.logout();
      } catch {}
      try {
        session.sock.end();
      } catch {}
    }
    const authDir = path.join(AUTH_BASE, storeId);
    try {
      fs.rmSync(authDir, { recursive: true, force: true });
    } catch {}
    delete sessions[storeId];
    return json(res, 200, { ok: true, message: "Sessão removida" });
  }

  // POST /send/:storeId — envia mensagem
  if (req.method === "POST" && parts[0] === "send" && parts[1]) {
    const storeId = parts[1];
    const session = getSession(storeId);

    if (!session || !session.connected || !session.sock) {
      return json(res, 503, { error: "WhatsApp não conectado para esta loja" });
    }

    try {
      const body = JSON.parse(await readBody(req));
      const { phone, text } = body;
      if (!phone || !text) return json(res, 400, { error: "phone e text obrigatórios" });

      const jid = phone.replace(/\D/g, "") + "@s.whatsapp.net";
      await session.sock.sendMessage(jid, { text });
      console.log(`[${storeId}] Mensagem enviada para ${jid}`);
      return json(res, 200, { success: true, to: jid });
    } catch (e) {
      console.error(`[${storeId}] Erro ao enviar:`, e.message);
      return json(res, 500, { error: e.message });
    }
  }

  // POST /send (legado — retrocompatível, usa primeira sessão conectada)
  if (req.method === "POST" && parts[0] === "send" && !parts[1]) {
    const firstConnected = Object.entries(sessions).find(([, s]) => s.connected);
    if (!firstConnected) return json(res, 503, { error: "Nenhuma sessão conectada" });

    try {
      const body = JSON.parse(await readBody(req));
      const { phone, text } = body;
      if (!phone || !text) return json(res, 400, { error: "phone e text obrigatórios" });

      const jid = phone.replace(/\D/g, "") + "@s.whatsapp.net";
      await firstConnected[1].sock.sendMessage(jid, { text });
      console.log(`[${firstConnected[0]}] Mensagem enviada para ${jid} (legado)`);
      return json(res, 200, { success: true, to: jid });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  json(res, 404, { error: "Not found" });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor WhatsApp multi-sessão rodando na porta ${PORT}`);
  bootExistingSessions();
});
