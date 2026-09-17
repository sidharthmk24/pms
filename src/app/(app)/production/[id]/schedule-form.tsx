"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { MultiSelectDropdown, type DropdownOption } from "@/components/dropdown";
import { hasAnyRole, formatRoleLabel, parseUserRoles, type Role } from "@/lib/roles";
import { UserCheck, Users, Calendar, Pencil, X, CheckCircle2 } from "lucide-react";

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

function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return "No deadline set";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
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

  const [proofDate, setProofDate] = useState(project.proof_deadline ?? "");

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.id, u.name));
    return map;
  }, [users]);

  const hasAnyAssignments = useMemo(() => {
    return Boolean(
      (project.dtp_assigned_to || project.dtp_assignees || project.dtp_deadline) ||
      (project.editing_assigned_to || project.editing_assignees || project.editing_deadline) ||
      (project.cover_assigned_to || project.cover_assignees || project.cover_deadline) ||
      (project.isbn_assigned_to || project.isbn_assignees || project.isbn_deadline) ||
      project.proof_deadline
    );
  }, [project]);

  const [isEditing, setIsEditing] = useState(!hasAnyAssignments);

  // All team members (excluding author-only users) available for all assignment dropdowns
  const teamOptions = useMemo<DropdownOption[]>(() => {
    return users
      .filter((u) => {
        const roles = parseUserRoles(u.role);
        if (roles.includes("author") && roles.length === 1) return false;
        return true;
      })
      .map((u) => ({
        value: u.id,
        label: u.name,
        description: formatRoleLabel(u.role),
      }));
  }, [users]);

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
      proofAssignedTo: null,
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
        setIsEditing(false);
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setPending(false);
    }
  }

  const helperRenderAssignees = (ids: string[]) => {
    if (!ids || ids.length === 0) {
      return <span className="text-xs text-muted-foreground italic">Unassigned</span>;
    }
    return (
      <div className="flex flex-wrap gap-1 mt-0.5">
        {ids.map((id) => (
          <span
            key={id}
            className="inline-flex items-center rounded-md border border-black/10 bg-white px-2 py-0.5 text-xs font-semibold text-foreground shadow-2xs dark:border-white/10 dark:bg-white/5"
          >
            {userMap.get(id) || id}
          </span>
        ))}
      </div>
    );
  };

  if (!isEditing) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Production Schedule &amp; Assignments</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Assigned
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Milestone assignments and deadlines configured for this production run.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="apple-button inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-foreground shadow-2xs hover:bg-black/5 dark:border-white/10 dark:bg-surface-elevated dark:hover:bg-white/5 transition-all cursor-pointer shrink-0"
          >
            <Pencil className="h-3.5 w-3.5 text-primary" />
            <span>Reassign / Edit Schedule</span>
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {/* DTP */}
          <div className="rounded-xl border border-black/8 bg-black/[0.02] p-3 space-y-1.5 dark:border-white/8 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                DTP / Typesetting
              </span>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDateDisplay(dtpDate)}
              </span>
            </div>
            {helperRenderAssignees(dtpUsers)}
          </div>

          {/* Editing */}
          <div className="rounded-xl border border-black/8 bg-black/[0.02] p-3 space-y-1.5 dark:border-white/8 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Proofreading &amp; Editing
              </span>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDateDisplay(editingDate)}
              </span>
            </div>
            {helperRenderAssignees(editingUsers)}
          </div>

          {/* Cover */}
          <div className="rounded-xl border border-black/8 bg-black/[0.02] p-3 space-y-1.5 dark:border-white/8 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Cover Design
              </span>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDateDisplay(coverDate)}
              </span>
            </div>
            {helperRenderAssignees(coverUsers)}
          </div>

          {/* ISBN */}
          <div className="rounded-xl border border-black/8 bg-black/[0.02] p-3 space-y-1.5 dark:border-white/8 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                ISBN Registration
              </span>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDateDisplay(isbnDate)}
              </span>
            </div>
            {helperRenderAssignees(isbnUsers)}
          </div>

          {/* Final Proof */}
          <div className="rounded-xl border border-black/8 bg-black/[0.02] p-3 space-y-1.5 dark:border-white/8 dark:bg-white/[0.02] sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Author Final Proof
              </span>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDateDisplay(proofDate)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium mt-0.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Author &amp; Owner Direct Approval</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-surface p-5 space-y-6 shadow-xs animate-apple-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Production Schedule &amp; Assignments</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign one or more team members and deadlines for each stage. All active team members are available for assignment.
          </p>
        </div>
        {hasAnyAssignments && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="apple-button inline-flex items-center gap-1 rounded-xl border border-black/10 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-200 transition-colors cursor-pointer dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
            <span>Cancel</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* DTP */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                DTP / Typesetting Assignees
              </label>
            </div>
            <MultiSelectDropdown
              size="sm"
              values={dtpUsers}
              onChange={(vals) => setDtpUsers(vals)}
              options={teamOptions}
              placeholder="Select team members…"
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Editing Assignees
              </label>
            </div>
            <MultiSelectDropdown
              size="sm"
              values={editingUsers}
              onChange={(vals) => setEditingUsers(vals)}
              options={teamOptions}
              placeholder="Select team members…"
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cover Design Assignees
              </label>
            </div>
            <MultiSelectDropdown
              size="sm"
              values={coverUsers}
              onChange={(vals) => setCoverUsers(vals)}
              options={teamOptions}
              placeholder="Select team members…"
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ISBN Registration Assignees
              </label>
            </div>
            <MultiSelectDropdown
              size="sm"
              values={isbnUsers}
              onChange={(vals) => setIsbnUsers(vals)}
              options={teamOptions}
              placeholder="Select team members…"
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

        {/* Final Proof Sign-Off */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Final Proof Sign-Off
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="font-medium text-foreground">Author &amp; Owner Sign-Off</span>
              <span className="text-[11px] text-muted-foreground">(Direct Approval)</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Proof sign-off is completed directly by the author via the digital proof link and approved by the owner. No internal staff assignment required.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Final Proof Deadline
            </label>
            <input
              type="date"
              value={proofDate}
              onChange={(e) => setProofDate(e.target.value)}
              className="w-full rounded-xl border border-black/12 bg-surface px-3 py-1.5 text-sm dark:border-white/15"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60 cursor-pointer shadow-plum-sm"
        >
          {pending ? "Saving Schedule..." : "Save Production Schedule"}
        </button>
        {hasAnyAssignments && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="apple-button rounded-xl border border-black/10 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-200 transition-colors cursor-pointer dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

