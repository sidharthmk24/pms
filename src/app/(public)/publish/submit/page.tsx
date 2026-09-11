import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Submit Your Manuscript · Kairali Books" };
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/author/submit");
  } else {
    redirect("/publish/onboarding");
  }
}
