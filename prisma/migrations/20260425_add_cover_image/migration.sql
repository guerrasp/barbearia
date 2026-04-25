-- Adiciona coluna cover_image (URL pública da foto de capa) na Store.
-- Usada na página /agendar/[slug] como banner/hero.
ALTER TABLE "stores" ADD COLUMN "cover_image" TEXT;
