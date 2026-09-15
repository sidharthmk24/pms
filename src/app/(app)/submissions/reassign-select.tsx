"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SmoothDropdown, type DropdownOption } from "@/components/dropdown";
import { formatRoleLabel } from "@/lib/roles";

type Editor = {
  id: string;
  name: string;
  role: string;
};

export default function ReassignSelect({
  submissionId,
  currentEditorId,
  currentEditorName,
  editors,
}: {
  submissionId: string;
  currentEditorId: string | null;
  currentEditorName?: string | null;
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

  const options: DropdownOption[] = [
    { value: "", label: "Unassigned" },
    ...(currentEditorId && !editors.some((e) => e.id === currentEditorId)
      ? [
          {
            value: currentEditorId,
            label: `${currentEditorName || "Current Assignee"} (Non-Editor)`,
            disabled: true,
          },
        ]
      : []),
    ...editors.map((e) => ({
      value: e.id,
      label: e.name,
      description: formatRoleLabel(e.role),
    })),
  ];

  return (
    <div className="relative inline-flex items-center min-w-[170px]">
      <SmoothDropdown
        size="sm"
        value={value}
        disabled={pending}
        onChange={onChange}
        ariaLabel="Assign editor"
        options={options}
      />
      {pending && (
        <div className="pointer-events-none absolute right-8 flex items-center text-muted-foreground">
          <svg className="h-3.5 w-3.5 animate-spin text-foreground" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}
    </div>
  );
}



