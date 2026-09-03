"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MultiSelectDropdown, type DropdownOption } from "@/components/dropdown";

type UserOption = {
  id: string;
  name: string;
  role: string;
};

type ProjectData = {
  id: string;
  status: string;
  dtp_assigned_to: string | null;
  dtp_assignees?: string | null;
  dtp_deadline: string | null;
  editing_assigned_to: string | null;
  editing_assignees?: string | null;
  editing_deadline: string | null;
  cover_assigned_to: string | null;
  cover_assignees?: string | null;
  cover_deadline: string | null;
  isbn_assigned_to: string | null;
  isbn_assignees?: string | null;
  isbn_deadline: string | null;
  proof_assigned_to: string | null;
  proof_assignees?: string | null;
  proof_deadline: string | null;
};

function initialAssignees(assignedTo: string | null, assignees?: string | null): string[] {
  if (assignees) {
    return assignees.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return assignedTo ? [assignedTo] : [];
}

export default function ScheduleForm({
  project,
  users,
}: {
  project: ProjectData;
  users: UserOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-Assignee States
  const [dtpUsers, setDtpUsers] = useState<string[]>(() =>
    initialAssignees(project.dtp_assigned_to, project.dtp_assignees)
  );
  const [dtpDate, setDtpDate] = useState(project.dtp_deadline ?? "");

  const [editingUsers, setEditingUsers] = useState<string[]>(() =>
    initialAssignees(project.editing_assigned_to, project.editing_assignees)
  );
  const [editingDate, setEditingDate] = useState(project.editing_deadline ?? "");

  const [coverUsers, setCoverUsers] = useState<string[]>(() =>
    initialAssignees(project.cover_assigned_to, project.cover_assignees)
  );
  const [coverDate, setCoverDate] = useState(project.cover_deadline ?? "");

  const [isbnUsers, setIsbnUsers] = useState<string[]>(() =>
    initialAssignees(project.isbn_assigned_to, project.isbn_assignees)
  );
  const [isbnDate, setIsbnDate] = useState(project.isbn_deadline ?? "");

  const [proofUsers, setProofUsers] = useState<string[]>(() =>
    initialAssignees(project.proof_assigned_to, project.proof_assignees)
  );
  const [proofDate, setProofDate] = useState(project.proof_deadline ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const payload = {
      dtpAssignedTo: dtpUsers,
      dtpDeadline: dtpDate || null,
      editingAssignedTo: editingUsers,
      editingDeadline: editingDate || null,
      coverAssignedTo: coverUsers,
      coverDeadline: coverDate || null,
      isbnAssignedTo: isbnUsers,
      isbnDeadline: isbnDate || null,
      proofAssignedTo: proofUsers,
      proofDeadline: proofDate || null,
    };

    try {
      const res = await fetch(`/api/production/${project.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to save schedule");
      } else {
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setPending(false);
    }
  }

  const userOptions: DropdownOption[] = users.map((u) => ({
    value: u.id,
    label: u.name,
    description: u.role.charAt(0).toUpperCase() + u.role.slice(1),
  }));

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-5 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Production Schedule & Assignments</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Assign one or more staff members and deadlines for each stage. Saving will transition an "Under Contract" project to active DTP stage.
        </p>
      </div>

      <div className="space-y-4">
        {/* DTP */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              DTP / Typesetting Assignees
            </label>
            <MultiSelectDropdown
              size="sm"
              values={dtpUsers}
              onChange={(vals) => setDtpUsers(vals)}
              options={userOptions}
              placeholder="Select DTP assignees…"
              ariaLabel="Select DTP assignees"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              DTP Deadline
            </label>
            <input
              type="date"
              value={dtpDate}
              onChange={(e) => setDtpDate(e.target.value)}
              className="w-full rounded-xl border border-black/12 bg-surface px-3 py-1.5 text-sm dark:border-white/15"
            />
          </div>
        </div>

        {/* Editing */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Editing Assignees
            </label>
            <MultiSelectDropdown
              size="sm"
              values={editingUsers}
              onChange={(vals) => setEditingUsers(vals)}
              options={userOptions}
              placeholder="Select editing assignees…"
              ariaLabel="Select editing assignees"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Editing Deadline
            </label>
            <input
              type="date"
              value={editingDate}
              onChange={(e) => setEditingDate(e.target.value)}
              className="w-full rounded-xl border border-black/12 bg-surface px-3 py-1.5 text-sm dark:border-white/15"
            />
          </div>
        </div>

        {/* Cover */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Cover Design Assignees
            </label>
            <MultiSelectDropdown
              size="sm"
              values={coverUsers}
              onChange={(vals) => setCoverUsers(vals)}
              options={userOptions}
              placeholder="Select cover design assignees…"
              ariaLabel="Select cover design assignees"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Cover Deadline
            </label>
            <input
              type="date"
              value={coverDate}
              onChange={(e) => setCoverDate(e.target.value)}
              className="w-full rounded-xl border border-black/12 bg-surface px-3 py-1.5 text-sm dark:border-white/15"
            />
          </div>
        </div>

        {/* ISBN */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              ISBN Registration Assignees
            </label>
            <MultiSelectDropdown
              size="sm"
              values={isbnUsers}
              onChange={(vals) => setIsbnUsers(vals)}
              options={userOptions}
              placeholder="Select ISBN assignees…"
              ariaLabel="Select ISBN assignees"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              ISBN Deadline
            </label>
            <input
              type="date"
              value={isbnDate}
              onChange={(e) => setIsbnDate(e.target.value)}
              className="w-full rounded-xl border border-black/12 bg-surface px-3 py-1.5 text-sm dark:border-white/15"
            />
          </div>
        </div>

        {/* Proof */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Final Proof Assignees
            </label>
            <MultiSelectDropdown
              size="sm"
              values={proofUsers}
              onChange={(vals) => setProofUsers(vals)}
              options={userOptions}
              placeholder="Select proof assignees…"
              ariaLabel="Select proof assignees"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Final Proof Deadline
            </label>
            <input
              type="date"
              value={proofDate}
              onChange={(e) => setProofDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Saving Schedule..." : "Save Production Schedule"}
      </button>
    </form>
  );
}
