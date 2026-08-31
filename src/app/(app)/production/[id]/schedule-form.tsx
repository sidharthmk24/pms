"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UserOption = {
  id: string;
  name: string;
  role: string;
};

type ProjectData = {
  id: string;
  status: string;
  dtp_assigned_to: string | null;
  dtp_deadline: string | null;
  editing_assigned_to: string | null;
  editing_deadline: string | null;
  cover_assigned_to: string | null;
  cover_deadline: string | null;
  isbn_assigned_to: string | null;
  isbn_deadline: string | null;
  proof_assigned_to: string | null;
  proof_deadline: string | null;
};

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

  // States
  const [dtpUser, setDtpUser] = useState(project.dtp_assigned_to ?? "");
  const [dtpDate, setDtpDate] = useState(project.dtp_deadline ?? "");
  const [editingUser, setEditingUser] = useState(project.editing_assigned_to ?? "");
  const [editingDate, setEditingDate] = useState(project.editing_deadline ?? "");
  const [coverUser, setCoverUser] = useState(project.cover_assigned_to ?? "");
  const [coverDate, setCoverDate] = useState(project.cover_deadline ?? "");
  const [isbnUser, setIsbnUser] = useState(project.isbn_assigned_to ?? "");
  const [isbnDate, setIsbnDate] = useState(project.isbn_deadline ?? "");
  const [proofUser, setProofUser] = useState(project.proof_assigned_to ?? "");
  const [proofDate, setProofDate] = useState(project.proof_deadline ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const payload = {
      dtpAssignedTo: dtpUser || null,
      dtpDeadline: dtpDate || null,
      editingAssignedTo: editingUser || null,
      editingDeadline: editingDate || null,
      coverAssignedTo: coverUser || null,
      coverDeadline: coverDate || null,
      isbnAssignedTo: isbnUser || null,
      isbnDeadline: isbnDate || null,
      proofAssignedTo: proofUser || null,
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

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-5 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Production Schedule & Assignments</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Define stage assignees and deadlines. Saving will transition an "Under Contract" project to active DTP stage.
        </p>
      </div>

      <div className="space-y-4">
        {/* DTP */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              DTP / Typesetting Assignee
            </label>
            <select
              value={dtpUser}
              onChange={(e) => setDtpUser(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              DTP Deadline
            </label>
            <input
              type="date"
              value={dtpDate}
              onChange={(e) => setDtpDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Editing */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Editing Assignee
            </label>
            <select
              value={editingUser}
              onChange={(e) => setEditingUser(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Editing Deadline
            </label>
            <input
              type="date"
              value={editingDate}
              onChange={(e) => setEditingDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Cover */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Cover Design Assignee
            </label>
            <select
              value={coverUser}
              onChange={(e) => setCoverUser(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Cover Deadline
            </label>
            <input
              type="date"
              value={coverDate}
              onChange={(e) => setCoverDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* ISBN */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              ISBN Registration Assignee
            </label>
            <select
              value={isbnUser}
              onChange={(e) => setIsbnUser(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              ISBN Deadline
            </label>
            <input
              type="date"
              value={isbnDate}
              onChange={(e) => setIsbnDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Proof */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Final Proof Assignee
            </label>
            <select
              value={proofUser}
              onChange={(e) => setProofUser(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
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
