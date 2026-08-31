import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Atomically claims the next document number. Must be called inside the same
 * transaction as the row it numbers, otherwise a rollback burns the number.
 * Mirrors the existing invoice:/print_job: counters.
 */
export async function nextDocNo(
  tx: Prisma.TransactionClient,
  prefix: string,
  code: string,
  year = new Date().getUTCFullYear(),
): Promise<string> {
  const name = `${prefix}:${year}`;
  const row = await tx.counters.upsert({
    where: { name },
    create: { name, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${code}-${year}-${String(row.value).padStart(4, "0")}`;
}
