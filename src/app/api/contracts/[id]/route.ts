import { fail, handler, ok } from "@/lib/api";
import { requireApiCapability } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireApiCapability("contracts.read");
  const { id } = await params;

  const contract = await prisma.contracts.findUnique({
    where: { id },
    include: {
      authors: {
        select: {
          id: true,
          name: true,
          name_ml: true,
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
          name_ml: true,
          category: true,
          language: true,
          stock: true,
          status: true,
        },
      },
    },
  });

  if (!contract) {
    return fail(404, "Contract not found");
  }

  return ok({ contract });
});
