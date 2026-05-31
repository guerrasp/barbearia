-- CreateEnum
CREATE TYPE "ChatbotDirection" AS ENUM ('CUSTOMER_MSG', 'BOT_REPLY');

-- CreateTable
CREATE TABLE "chatbot_messages" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "direction" "ChatbotDirection" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatbot_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chatbot_messages_store_id_created_at_idx" ON "chatbot_messages"("store_id", "created_at");
