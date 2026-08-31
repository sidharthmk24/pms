import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SigningClient from "./signing-client";

export const metadata: Metadata = {
  title: "Review & Sign Publishing Agreement · Kairali Books",
  description: "Secure digital contract execution for Kairali Books authors.",
};
export const dynamic = "force-dynamic";

export default async function AuthorContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    notFound();
  }

  return <SigningClient contract={contract} />;
}
