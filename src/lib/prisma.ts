import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Em dev usa DIRECT_URL (porta 5432), em prod usa DATABASE_URL (pooler porta 6543)
  const connectionString =
    process.env.NODE_ENV === "production"
      ? process.env.DATABASE_URL!
      : (process.env.DIRECT_URL || process.env.DATABASE_URL!);
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
