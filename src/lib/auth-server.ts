import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/super-admin";

/**
 * Helpers de autenticação para rotas API.
 *
 * Modelo:
 * - Cliente envia o access token do Supabase no header Authorization:
 *   `Authorization: Bearer <jwt>`
 * - Validamos o JWT contra o Supabase (pega o user.id)
 * - Buscamos o User no banco pra obter role + storeId
 *
 * Pra rotas de loja, sempre use `requireUserForStore(req, storeId)` —
 * ela rejeita se o usuário pertencer a outra loja, exceto super-admins.
 */

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "BARBER" | "CUSTOMER";
  storeId: string;
  isSuperAdmin: boolean;
}

type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse };

/** Extrai e valida o JWT. Retorna usuário do nosso DB ou erro 401. */
export async function getAuthUser(req: Request): Promise<AuthResult> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  const token = header.substring("Bearer ".length).trim();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Token vazio" }, { status: 401 }),
    };
  }

  // Valida JWT no Supabase. Faz round-trip de rede (~50-150ms) — OK pra
  // proteção real. Pra cacheamento futuro, dá pra decodificar e validar
  // signature local com a public key do projeto.
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Token inválido" }, { status: 401 }),
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: data.user.id },
    select: { id: true, email: true, role: true, storeId: true },
  });

  if (!dbUser) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 }),
    };
  }

  return {
    ok: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      storeId: dbUser.storeId,
      isSuperAdmin: isSuperAdmin(dbUser.email),
    },
  };
}

/** Valida JWT + confirma que o user pertence à loja informada (ou é super-admin).
 *  Retorna 401 se não autenticado, 403 se loja errada. */
export async function requireUserForStore(
  req: Request,
  storeId: string,
): Promise<AuthResult> {
  const auth = await getAuthUser(req);
  if (!auth.ok) return auth;

  // Super-admins acessam qualquer loja
  if (auth.user.isSuperAdmin) return auth;

  // ADMIN/BARBER só acessam a própria loja
  if (auth.user.storeId !== storeId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Acesso negado a esta loja" },
        { status: 403 },
      ),
    };
  }

  return auth;
}

/** Apenas valida JWT e exige role ADMIN. Útil para ações administrativas
 *  (criar/editar/deletar) onde BARBER não deve ter acesso. */
export async function requireAdminForStore(
  req: Request,
  storeId: string,
): Promise<AuthResult> {
  const auth = await requireUserForStore(req, storeId);
  if (!auth.ok) return auth;
  if (auth.user.role !== "ADMIN" && !auth.user.isSuperAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Apenas administradores" },
        { status: 403 },
      ),
    };
  }
  return auth;
}
