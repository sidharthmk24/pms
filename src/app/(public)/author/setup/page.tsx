import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AuthorSetupClient from "./setup-client";

export const metadata: Metadata = {
  title: "Set Up Author Portal · Kairali Books",
  description: "Create your Author Portal account to track manuscript reviews, signed contracts, and live production stages.",
};
export const dynamic = "force-dynamic";

type PageProps<T extends string> = {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthorSetupPage({ searchParams }: PageProps<"/author/setup">) {
  const { email, contract } = await searchParams;
  const initialEmail = typeof email === "string" ? email : "";
  const contractId = typeof contract === "string" ? contract : "";

  let authorName = "";
  let bookTitle = "";

  if (contractId) {
    const contractRow = await prisma.contracts.findUnique({
      where: { id: contractId },
      include: { authors: true, titles: true },
    });
    if (contractRow) {
      authorName = contractRow.authors.name;
      bookTitle = contractRow.titles.name;
    }
  }

  if (!authorName && initialEmail) {
    const authorRow = await prisma.authors.findFirst({
      where: { email: { equals: initialEmail, mode: "insensitive" } },
    });
    if (authorRow) {
      authorName = authorRow.name;
    } else {
      const subRow = await prisma.submissions.findFirst({
        where: { email: { equals: initialEmail, mode: "insensitive" } },
      });
      if (subRow) {
        authorName = subRow.author_name;
        bookTitle = subRow.title;
      }
    }
  }

  return (
    <AuthorSetupClient
      initialEmail={initialEmail}
      contractId={contractId}
      authorName={authorName}
      bookTitle={bookTitle}
    />
  );
}
