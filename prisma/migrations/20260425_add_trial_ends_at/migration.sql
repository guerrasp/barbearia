-- Adiciona campo trialEndsAt para suportar trial de 14 dias do plano Pioneiro.
-- Lojas existentes (anteriores ao novo modelo de billing) ficam com NULL e são
-- tratadas como "grandfathered" (sem trial expirando) pela camada de aplicação.
ALTER TABLE "stores" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
