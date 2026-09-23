import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthorContractsClient } from "./author-contracts-client";

export const metadata: Metadata = {
  title: "My Contracts & Agreements · Kairali Books",
  description: "View and execute publishing contracts related to your author account.",
};

export const dynamic = "force-dynamic";

export default async function AuthorContractsPage() {
  const user = await requireUser();

  const author = await prisma.authors.findFirst({
    where: { email: { equals: user.email, mode: "insensitive" } },
  });

  const contracts = await prisma.contracts.findMany({
    where: {
      OR: [
        { authors: { email: { equals: user.email, mode: "insensitive" } } },
        ...(author?.id ? [{ author_id: author.id }] : []),
        { term_notes: { contains: user.email } },
      ],
    },
    include: {
      titles: {
        select: {
          id: true,
          name: true,
          name_ml: true,
          category: true,
          language: true,
        },
      },
      authors: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return <AuthorContractsClient contracts={contracts as any} />;
}
