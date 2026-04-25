import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Upload de arquivos pra Supabase Storage.
 *
 * Bucket público "store-assets" (criar no Supabase Dashboard antes de usar).
 * Caminho: <storeId>/<kind>/<random>.<ext>  →  evita colisão e mantém isolamento.
 *
 * Limites:
 * - Tamanho máximo: 5 MB
 * - Tipos aceitos: image/jpeg, image/png, image/webp
 *
 * Retorna a URL pública pra salvar no banco.
 */

const BUCKET = "store-assets";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadKind = "logo" | "cover" | "barber";

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadStoreAsset(args: {
  storeId: string;
  kind: UploadKind;
  file: Buffer;
  contentType: string;
  originalName?: string;
}): Promise<UploadResult> {
  if (!ALLOWED_MIME.has(args.contentType)) {
    throw new Error(
      "Formato não suportado. Use JPG, PNG ou WebP.",
    );
  }
  if (args.file.length > MAX_SIZE) {
    throw new Error("Imagem maior que 5 MB. Reduza o tamanho e tente novamente.");
  }

  const ext = args.contentType.split("/")[1].replace("jpeg", "jpg");
  const random = Math.random().toString(36).substring(2, 10);
  const path = `${args.storeId}/${args.kind}/${random}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, args.file, {
      contentType: args.contentType,
      cacheControl: "3600", // cache CDN 1h
      upsert: false,
    });

  if (error) {
    throw new Error(`Falha no upload: ${error.message}`);
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Apaga um asset anterior pra não acumular lixo no storage. */
export async function deleteStoreAsset(path: string): Promise<void> {
  if (!path) return;
  await supabaseAdmin.storage.from(BUCKET).remove([path]);
}

/** Extrai o path interno do bucket a partir da URL pública. Útil para
 *  apagar a imagem antiga quando o usuário substitui. */
export function pathFromPublicUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(new RegExp(`/storage/v1/object/public/${BUCKET}/(.+)$`));
  return match?.[1] ?? null;
}
