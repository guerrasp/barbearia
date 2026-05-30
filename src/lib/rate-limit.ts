import { NextResponse } from "next/server";

interface Entry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Entry>();

// Limpa entradas expiradas a cada 60s para não acumular memória
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}, 60_000).unref();

/**
 * Rate limiter in-memory por IP. Retorna null se permitido, ou
 * NextResponse 429 se excedeu o limite.
 *
 * Nota: em serverless cada instância tem sua própria memória, então
 * o limite real é por-instância. Suficiente para bloquear bots triviais.
 * Para limites globais, usar Vercel KV ou Upstash Redis.
 */
export function rateLimit(
  req: Request,
  opts: { limit: number; windowMs: number; prefix?: string },
): NextResponse | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const key = `${opts.prefix ?? "rl"}:${ip}`;
  const now = Date.now();

  let entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + opts.windowMs };
    buckets.set(key, entry);
  }

  entry.count++;

  if (entry.count > opts.limit) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em breve." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      },
    );
  }

  return null;
}
