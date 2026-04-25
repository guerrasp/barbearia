-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- AlterTable
ALTER TABLE "stores"
  ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "stripe_customer_id" TEXT,
  ADD COLUMN "stripe_subscription_id" TEXT,
  ADD COLUMN "plan_renews_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "stores_stripe_customer_id_key" ON "stores"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_stripe_subscription_id_key" ON "stores"("stripe_subscription_id");
