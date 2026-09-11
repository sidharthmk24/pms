import type { Metadata } from "next";
import AuthorRegisterClient from "./register-client";

export const metadata: Metadata = {
  title: "Register Author Account · Kairali Books",
  description: "Create your Author Portal account to monitor manuscript review progress with live Amazon/Flipkart-style delivery tracking.",
};

export const dynamic = "force-dynamic";

type PageProps<T extends string> = {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthorRegisterPage({ searchParams }: PageProps<"/author/register">) {
  const { ref, name, email } = await searchParams;

  const initialRef = typeof ref === "string" ? ref : "";
  const initialName = typeof name === "string" ? name : "";
  const initialEmail = typeof email === "string" ? email : "";

  return (
    <AuthorRegisterClient
      initialRef={initialRef}
      initialName={initialName}
      initialEmail={initialEmail}
    />
  );
}
