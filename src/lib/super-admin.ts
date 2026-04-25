/**
 * Super-admin authorization helper.
 *
 * Defina KORTA_SUPER_ADMINS=email1@ex.com,email2@ex.com no ambiente.
 * Esses emails têm acesso ao painel /super (visão de todas as lojas).
 *
 * Esta camada respeita o modelo de auth atual do app (email-based, vindo do
 * AuthContext). Se a auth evoluir para validação de JWT do Supabase,
 * substitua o `headerEmail` por verificação de token aqui.
 */
export function getSuperAdminEmails(): string[] {
  const raw = process.env.KORTA_SUPER_ADMINS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = getSuperAdminEmails();
  return list.includes(email.toLowerCase());
}

export function requireSuperAdmin(req: Request): { ok: true; email: string } | { ok: false } {
  const email = req.headers.get("x-user-email");
  if (!email || !isSuperAdmin(email)) return { ok: false };
  return { ok: true, email };
}
