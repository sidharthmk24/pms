"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STAGE_VERBS: Record<string, string> = {
  dtp: "Typesetting & Layout",
  editing: "Editing & Proofreading",
  cover_design: "Cover Design",
  isbn_registration: "ISBN Application & Registration",
};

export default function TaskAdvance({
  projectId,
  status,
}: {
  projectId: string;
  status: string;
}) {
  const router = useRouter();
  const [isbn, setIsbn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData();
    if (status === "isbn_registration") {
      fd.append("isbn", isbn);
    } else if (status === "dtp" && file) {
      fd.append("layout_file", file);
    } else if (status === "cover_design" && file) {
      fd.append("cover_file", file);
    }

    try {
      const res = await fetch(`/api/production/${projectId}/advance`, {
        method: "POST",
        body: fd,
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to advance stage");
      } else {
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setPending(false);
    }
  }

  const verb = STAGE_VERBS[status] || "Current Task";

  const isFormValid =
    status === "isbn_registration"
      ? isbn.trim().length >= 5
      : status === "dtp" || status === "cover_design"
      ? file !== null
      : true;

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-warning/20 bg-warning/5 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-warning">Your Active Task: {verb}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload deliverables and complete this stage.
        </p>
      </div>

      {status === "dtp" && (
        <div className="space-y-1">
          <label htmlFor="layout_file" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Typeset Manuscript Layout PDF
          </label>
          <input
            id="layout_file"
            type="file"
            required
            accept=".pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full max-w-sm text-sm font-medium mt-1"
          />
        </div>
      )}

      {status === "cover_design" && (
        <div className="space-y-1">
          <label htmlFor="cover_file" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Book Cover Design File (Image/PDF)
          </label>
          <input
            id="cover_file"
            type="file"
            required
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full max-w-sm text-sm font-medium mt-1"
          />
        </div>
      )}

      {status === "isbn_registration" && (
        <div className="space-y-1">
          <label htmlFor="isbn" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Registered ISBN Number
          </label>
          <input
            id="isbn"
            type="text"
            required
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="e.g. 978-81-X-XXXX-X"
            className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-1.5 text-sm mt-1"
          />
        </div>
      )}

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

      <button
        type="submit"
        disabled={pending || !isFormValid}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Updating status..." : `Complete ${verb}`}
      </button>
    </form>
  );
}
