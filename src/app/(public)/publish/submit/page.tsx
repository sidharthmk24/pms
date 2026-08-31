import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { submissionsOpen } from "@/lib/settings";
import SubmissionForm from "./submission-form";

export const metadata: Metadata = { title: "Submit your manuscript" };
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  if (!(await submissionsOpen())) redirect("/publish");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <nav className="mb-6 text-sm">
        <Link href="/publish" className="text-muted-foreground hover:text-foreground">
          ← Submission guidelines
        </Link>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Submit your manuscript</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Fields marked <span className="text-danger">*</span> are required. Nothing is saved
          until you press Submit.
        </p>
      </header>

      <SubmissionForm />
    </div>
  );
}
