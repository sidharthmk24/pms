import { fail, handler, ok } from "@/lib/api";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const GET = handler(async () => {
  await requireApiCapability("contracts.read");

  const contracts = await prisma.contracts.findMany({
    include: {
      authors: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          pan: true,
          address: true,
        },
      },
      titles: {
        select: {
          id: true,
          name: true,
          category: true,
          language: true,
          stock: true,
          status: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return ok({ contracts });
});
