-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'PAUSED');

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_in_cents" INTEGER NOT NULL,
    "max_uses_per_month" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "store_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_services" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,

    CONSTRAINT "subscription_plan_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_subscriptions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "uses_this_period" INTEGER NOT NULL DEFAULT 0,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_services_plan_id_service_id_key" ON "subscription_plan_services"("plan_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_subscriptions_stripe_subscription_id_key" ON "customer_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "customer_subscriptions_store_id_status_idx" ON "customer_subscriptions"("store_id", "status");

-- CreateIndex
CREATE INDEX "customer_subscriptions_customer_id_idx" ON "customer_subscriptions"("customer_id");

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_services" ADD CONSTRAINT "subscription_plan_services_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_services" ADD CONSTRAINT "subscription_plan_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
