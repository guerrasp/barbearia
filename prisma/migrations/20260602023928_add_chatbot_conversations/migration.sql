-- CreateTable
CREATE TABLE "chatbot_conversations" (
    "store_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "step" TEXT NOT NULL DEFAULT 'menu',
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_conversations_pkey" PRIMARY KEY ("store_id","phone")
);

-- CreateIndex
CREATE INDEX "chatbot_conversations_updated_at_idx" ON "chatbot_conversations"("updated_at");
