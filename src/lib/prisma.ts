import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function parseSchema(connectionString: string): string | undefined {
  try {
    const url = new URL(connectionString);
    return url.searchParams.get("schema") || undefined;
  } catch {
    return undefined;
  }
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const schema = parseSchema(connectionString) ?? "kairali_pms";
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }, { schema }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Invalidate stale client on hot-reload
delete globalForPrisma.prisma;

export const prisma = createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
