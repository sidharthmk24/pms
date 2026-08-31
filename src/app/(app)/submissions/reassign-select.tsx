"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Editor = {
  id: string;
  name: string;
  role: string;
};

export default function ReassignSelect({
  submissionId,
  currentEditorId,
  editors,
}: {
  submissionId: string;
  currentEditorId: string | null;
  editors: Editor[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentEditorId ?? "");
  const [pending, setPending] = useState(false);

  async function onChange(editorId: string) {
    setPending(true);
    setValue(editorId);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorId: editorId || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error ?? "Reassignment failed");
        setValue(currentEditorId ?? "");
      } else {
        router.refresh();
      }
    } catch {
      alert("Could not reach the server");
      setValue(currentEditorId ?? "");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Assign editor"
        className="apple-button appearance-none rounded-xl border border-black/15 bg-background/90 py-2 pl-3.5 pr-8 text-sm font-semibold text-foreground outline-none transition-colors hover:border-black/30 focus:border-foreground dark:border-white/15 dark:bg-surface-muted/80 dark:hover:border-white/30 disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {editors.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 flex items-center text-muted-foreground">
        {pending ? (
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  );
}


