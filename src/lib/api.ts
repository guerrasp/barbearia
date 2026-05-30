const BASE_URL = "/api";

/** Lê o access token salvo no localStorage pelo AuthContext. SSR-safe. */
function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("korta_session");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.access_token === "string" ? parsed.access_token : null;
  } catch {
    return null;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = readAccessToken();
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) baseHeaders["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { ...baseHeaders, ...(options?.headers as Record<string, string>) },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `Erro ${res.status}`);
  }

  return res.json();
}

/** Upload multipart (FormData). Não seta Content-Type — o browser
 *  define o boundary automaticamente. Inclui Authorization igual aos
 *  outros métodos. */
async function uploadRequest<T>(url: string, formData: FormData): Promise<T> {
  const token = readAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${url}`, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `Erro ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(url: string, data: unknown) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(url: string, data: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  upload: <T>(url: string, formData: FormData) => uploadRequest<T>(url, formData),
};
