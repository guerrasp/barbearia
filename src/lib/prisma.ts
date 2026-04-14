import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Em produção (Vercel serverless) usa o pooler; em dev usa conexão direta
  const connectionString =
    process.env.NODE_ENV === "production"
      ? process.env.DATABASE_URL!
      : (process.env.DIRECT_URL || process.env.DATABASE_URL!);
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
