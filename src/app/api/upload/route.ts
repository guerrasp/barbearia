import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  uploadStoreAsset,
  deleteStoreAsset,
  pathFromPublicUrl,
  type UploadKind,
} from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // precisa de Buffer

const VALID_KINDS = new Set<UploadKind>(["logo", "cover", "barber"]);

/** POST /api/upload — upload multipart de logo/capa/foto de barbeiro.
 *
 * FormData:
 * - file: File (obrigatório)
 * - storeId: string (obrigatório)
 * - kind: "logo" | "cover" | "barber" (obrigatório)
 * - barberId: string (opcional — só quando kind=barber)
 *
 * Retorna { url } pra que o cliente salve no campo correspondente
 * (loja.logo, loja.coverImage, ou barber.photo).
 *
 * Pra logo/capa, atualiza a loja em uma transação e apaga o asset
 * anterior pra economizar espaço.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const storeId = form.get("storeId");
    const kind = form.get("kind");
    const barberId = form.get("barberId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
    }
    if (typeof storeId !== "string" || !storeId) {
      return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
    }
    if (typeof kind !== "string" || !VALID_KINDS.has(kind as UploadKind)) {
      return NextResponse.json({ error: "kind inválido" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadStoreAsset({
      storeId,
      kind: kind as UploadKind,
      file: buffer,
      contentType: file.type,
      originalName: file.name,
    });

    // Persiste no banco e remove o asset anterior (best-effort)
    if (kind === "logo" || kind === "cover") {
      const field = kind === "logo" ? "logo" : "coverImage";
      const previous = await prisma.store.findUnique({
        where: { id: storeId },
        select: { [field]: true } as never,
      });
      const previousUrl = (previous as Record<string, string | null> | null)?.[field] ?? null;

      await prisma.store.update({
        where: { id: storeId },
        data: { [field]: result.url },
      });

      if (previousUrl) {
        const oldPath = pathFromPublicUrl(previousUrl);
        if (oldPath) deleteStoreAsset(oldPath).catch(() => {});
      }
    } else if (kind === "barber") {
      if (typeof barberId !== "string" || !barberId) {
        return NextResponse.json(
          { error: "barberId obrigatório para kind=barber" },
          { status: 400 },
        );
      }
      const previous = await prisma.barber.findFirst({
        where: { id: barberId, storeId },
        select: { photo: true },
      });
      if (!previous) {
        return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
      }
      await prisma.barber.update({
        where: { id: barberId },
        data: { photo: result.url },
      });
      if (previous.photo) {
        const oldPath = pathFromPublicUrl(previous.photo);
        if (oldPath) deleteStoreAsset(oldPath).catch(() => {});
      }
    }

    return NextResponse.json({ url: result.url, path: result.path });
  } catch (error) {
    console.error("[/api/upload]", error);
    const message = error instanceof Error ? error.message : "Erro no upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
