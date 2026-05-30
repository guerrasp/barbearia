export const RESERVED_SLUGS = new Set([
  "admin", "api", "agendar", "cadastro", "criar-loja", "login", "app",
  "korta", "static", "_next", "public", "sobre", "para-barbearias",
  "termos", "privacidade", "contato",
]);

export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}
