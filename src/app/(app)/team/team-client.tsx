"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/roles";

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
  _count: {
    submissions: number;
  };
};

export default function TeamClient({
  users,
  currentUserId,
}: {
  users: TeamUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [resettingUser, setResettingUser] = useState<TeamUser | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("production");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to create user");
      } else {
        setSuccess(`User ${name} created successfully!`);
        setIsAddOpen(false);
        setName("");
        setEmail("");
        setPassword("");
        setRole("production");
        router.refresh();
      }
    } catch {
      setError("Network error while creating user");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/team/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to update user");
      } else {
        setSuccess(`User ${name} updated successfully!`);
        setEditingUser(null);
        router.refresh();
      }
    } catch {
      setError("Network error while updating user");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(user: TeamUser) {
    if (user.id === currentUserId && user.active) {
      alert("You cannot deactivate your own account.");
      return;
    }

    const nextState = !user.active;
    if (!confirm(`Are you sure you want to ${nextState ? "activate" : "deactivate"} ${user.name}?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextState }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error ?? "Failed to change active status");
      } else {
        router.refresh();
      }
    } catch {
      alert("Network error while updating status");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resettingUser) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/team/${resettingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to reset password");
      } else {
        setSuccess(`Password for ${resettingUser.name} reset successfully!`);
        setResettingUser(null);
        setNewPassword("");
        router.refresh();
      }
    } catch {
      setError("Network error while resetting password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner Notifications */}
      {success && (
        <div className="flex items-center justify-between rounded-2xl border border-success/30 bg-success/10 p-4 text-sm font-bold text-success">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-xs opacity-75 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm font-bold text-danger">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs opacity-75 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Team & Roles</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Manage publisher staff accounts, access permissions, and editorial workload assignments.
          </p>
        </div>

        <button
          onClick={() => {
            setName("");
            setEmail("");
            setRole("production");
            setPassword("");
            setError(null);
            setIsAddOpen(true);
          }}
          className="apple-button inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Team Members Bento Table */}
      <section className="overflow-hidden rounded-[28px] border border-black/[0.08] bg-surface/90 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-black/[0.02] text-xs font-bold uppercase tracking-wider text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.02]">
              <tr>
                <th className="px-6 py-4.5">Member</th>
                <th className="px-6 py-4.5">Email</th>
                <th className="px-6 py-4.5">Submissions Workload</th>
                <th className="px-6 py-4.5">Status</th>
                <th className="px-6 py-4.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {users.map((user) => {
                const initials = user.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const isCurrent = user.id === currentUserId;

                return (
                  <tr key={user.id} className="transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                    {/* Member Name + Avatar */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-foreground text-sm font-extrabold text-background shadow-xs">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{user.name}</span>
                            {isCurrent && (
                              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:bg-white/10">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Added {user.created_at.slice(0, 10)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4.5 font-medium text-muted-foreground">
                      {user.email}
                    </td>

                    {/* Workload */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <span className="text-sm font-extrabold">{user._count.submissions}</span>
                        <span className="text-xs text-muted-foreground">assigned</span>
                      </div>
                    </td>

                    {/* Status indicator */}
                    <td className="px-6 py-4.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${user.active
                            ? "bg-success/10 text-success"
                            : "bg-danger/10 text-danger"
                          }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${user.active ? "bg-success" : "bg-danger"}`} />
                        {user.active ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setName(user.name);
                            setRole(user.role as Role);
                            setError(null);
                            setEditingUser(user);
                          }}
                          className="apple-button rounded-xl border border-black/10 bg-surface px-3 py-1.5 text-xs font-bold text-foreground hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60"
                        >
                          Edit Role
                        </button>

                        <button
                          onClick={() => {
                            setNewPassword("");
                            setError(null);
                            setResettingUser(user);
                          }}
                          className="apple-button rounded-xl border border-black/10 bg-surface px-3 py-1.5 text-xs font-bold text-foreground hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60"
                        >
                          Reset Pass
                        </button>

                        {!isCurrent && (
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`apple-button rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${user.active
                                ? "border-black/10 text-muted-foreground hover:border-danger/30 hover:bg-danger/10 hover:text-danger dark:border-white/15"
                                : "border-success/20 bg-success/5 text-success hover:bg-success/10"
                              }`}
                          >
                            {user.active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL 1: Add Team Member */}
      {isAddOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/15 dark:bg-black/40">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-surface dark:border-white/15">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">Add Team Member</h3>
                <p className="text-xs text-muted-foreground">Create account credentials and permissions.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Nair"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-white/[0.03] dark:focus:bg-surface"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="editor@kairalibooks.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-white/[0.03] dark:focus:bg-surface"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Role & Permissions
                </label>
                <div className="grid grid-cols-3 rounded-xl border border-black/10 bg-black/[0.04] p-1 dark:border-white/10 dark:bg-white/[0.04]">
                  {[
                    { val: "editor", label: "Editor" },
                    { val: "production", label: "Production" },
                    { val: "owner", label: "Owner" },
                  ].map((r) => (
                    <button
                      key={r.val}
                      type="button"
                      onClick={() => setRole(r.val as Role)}
                      className={`apple-button py-1.5 text-xs font-bold rounded-lg transition-all ${
                        role === r.val
                          ? "bg-surface text-foreground shadow-xs font-extrabold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {role === "editor" && "Reviews manuscripts, decides acceptance, and manages editorial revisions."}
                  {role === "production" && "Handles DTP typesetting, cover design, ISBN registration, and print runs."}
                  {role === "owner" && "Full administrative publisher access across all system modules."}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Password <span className="text-muted-foreground font-normal">(min. 8 characters)</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-white/[0.03] dark:focus:bg-surface"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs font-bold text-danger">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="apple-button flex-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-xs font-bold text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="apple-button flex-1 rounded-xl bg-foreground py-2.5 text-xs font-bold text-background shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Member"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Edit User Role & Name */}
      {editingUser && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/15 dark:bg-black/40">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-surface dark:border-white/15">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">Edit Member Details</h3>
                <p className="text-xs text-muted-foreground">Update profile name and permissions.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-white/[0.03]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Email Address
                </label>
                <input
                  type="text"
                  disabled
                  value={editingUser.email}
                  className="w-full rounded-xl border border-black/10 bg-black/[0.04] px-3.5 py-2.5 text-sm font-medium text-muted-foreground outline-none dark:border-white/10 dark:bg-white/[0.04] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Role & Permissions
                </label>
                <div className="grid grid-cols-3 rounded-xl border border-black/10 bg-black/[0.04] p-1 dark:border-white/10 dark:bg-white/[0.04]">
                  {[
                    { val: "editor", label: "Editor" },
                    { val: "production", label: "Production" },
                    { val: "owner", label: "Owner" },
                  ].map((r) => (
                    <button
                      key={r.val}
                      type="button"
                      onClick={() => setRole(r.val as Role)}
                      className={`apple-button py-1.5 text-xs font-bold rounded-lg transition-all ${
                        role === r.val
                          ? "bg-surface text-foreground shadow-xs font-extrabold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {role === "editor" && "Reviews manuscripts, decides acceptance, and manages editorial revisions."}
                  {role === "production" && "Handles DTP typesetting, cover design, ISBN registration, and print runs."}
                  {role === "owner" && "Full administrative publisher access across all system modules."}
                </p>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs font-bold text-danger">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="apple-button flex-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-xs font-bold text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="apple-button flex-1 rounded-xl bg-foreground py-2.5 text-xs font-bold text-background shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: Reset Password */}
      {resettingUser && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/15 dark:bg-black/40">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-black/10 bg-surface dark:border-white/15">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">Reset Password</h3>
                <p className="text-xs text-muted-foreground">For {resettingUser.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  New Password <span className="text-muted-foreground font-normal">(min. 8 characters)</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-white/[0.03]"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Terminates all active sessions for this account.
                </p>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs font-bold text-danger">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="apple-button flex-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-xs font-bold text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="apple-button flex-1 rounded-xl bg-foreground py-2.5 text-xs font-bold text-background shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Resetting..." : "Set Password"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
