-- Troca o unique global em `code` por composto (store_id, code).
-- Motivo: SaaS multi-tenant — duas lojas devem poder ter o mesmo código
-- sequencial diário (AG-20260425-001) sem colidir.
DROP INDEX IF EXISTS "appointments_code_key";
CREATE UNIQUE INDEX "appointments_store_id_code_key" ON "appointments"("store_id", "code");
