"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  STAFF_ROLE_DEFINITIONS,
  parseUserRoles,
  hasRole,
  type StaffRole,
  type Role,
  ROLE_LABEL,
} from "@/lib/roles";

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

function renderRoleBadges(roleStr: string) {
  const roles = parseUserRoles(roleStr);
  if (roles.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-xs font-bold text-muted-foreground dark:border-white/10 dark:bg-white/5">
        No Role
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {roles.map((r) => {
        const def = STAFF_ROLE_DEFINITIONS.find((d) => d.val === r);
        if (!def) {
          return (
            <span
              key={r}
              className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2 py-0.5 text-xs font-semibold text-muted-foreground"
            >
              {r}
            </span>
          );
        }
        return (
          <span
            key={r}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${def.badgeClass}`}
          >
            {def.label}
          </span>
        );
      })}
    </div>
  );
}

export default function TeamClient({
  users,
  currentUserId,
  initialEditorOrder = [],
  rrCounterValue = 0,
}: {
  users: TeamUser[];
  currentUserId: string;
  initialEditorOrder?: string[];
  rrCounterValue?: number;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);

  // Editor Round-Robin Order state
  const [editorOrder, setEditorOrder] = useState<string[]>(initialEditorOrder);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderDraft, setOrderDraft] = useState<string[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  // Search and Role filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterRole, setSelectedFilterRole] = useState<string>("all");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<StaffRole[]>(["editor"]);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Active Editors list sorted by the configured rotation order
  const activeEditors = useMemo(() => {
    let base = users.filter((u: TeamUser) => u.active && parseUserRoles(u.role).includes("editor"));
    if (base.length === 0) {
      base = users.filter((u: TeamUser) => u.active && hasRole(u.role, "editor"));
    }
    return [...base].sort((a: TeamUser, b: TeamUser) => {
      const idxA = editorOrder.indexOf(a.id);
      const idxB = editorOrder.indexOf(b.id);
      const sortA = idxA !== -1 ? idxA : 9999;
      const sortB = idxB !== -1 ? idxB : 9999;
      if (sortA !== sortB) return sortA - sortB;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [users, editorOrder]);

  const totalEditors = activeEditors.length;
  const nextEditorIndex = totalEditors > 0 ? (rrCounterValue % totalEditors) : 0;

  function openOrderModal() {
    setOrderDraft(activeEditors.map((e: TeamUser) => e.id));
    setIsOrderModalOpen(true);
  }

  function moveEditorInDraft(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= orderDraft.length) return;
    const updated = [...orderDraft];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setOrderDraft(updated);
  }

  function setEditorPositionInDraft(editorId: string, newPos: number) {
    const fromIdx = orderDraft.indexOf(editorId);
    if (fromIdx === -1) return;
    const targetIdx = Math.max(0, Math.min(newPos - 1, orderDraft.length - 1));
    const updated = [...orderDraft];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(targetIdx, 0, moved);
    setOrderDraft(updated);
  }

  async function handleSaveEditorOrder(newOrderIds?: string[]) {
    const idsToSave = newOrderIds || orderDraft;
    if (idsToSave.length === 0) return;

    setSavingOrder(true);
    setError(null);
    try {
      const res = await fetch("/api/team/editor-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorIds: idsToSave }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to save editor rotation order");
      } else {
        setEditorOrder(idsToSave);
        setIsOrderModalOpen(false);
        setSuccess("Editor round-robin rotation sequence updated successfully!");
        router.refresh();
      }
    } catch {
      setError("Network error while saving editor order");
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleQuickSetPosition(editorId: string, targetPos: number) {
    const currentIds = activeEditors.map((e: TeamUser) => e.id);
    const fromIdx = currentIds.indexOf(editorId);
    if (fromIdx === -1) return;
    const targetIdx = Math.max(0, Math.min(targetPos - 1, currentIds.length - 1));
    const updated = [...currentIds];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(targetIdx, 0, moved);
    await handleSaveEditorOrder(updated);
  }

  function toggleRole(roleVal: StaffRole) {
    if (selectedRoles.includes(roleVal)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== roleVal));
      }
    } else {
      setSelectedRoles([...selectedRoles, roleVal]);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRoles.length === 0) {
      setError("Please select at least one role for this team member.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          roles: selectedRoles,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to create user");
      } else {
        setSuccess(`User ${name} created successfully with ${selectedRoles.length} role(s)!`);
        setIsAddOpen(false);
        setName("");
        setEmail("");
        setPassword("");
        setSelectedRoles(["editor"]);
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

    if (selectedRoles.length === 0) {
      setError("Please select at least one role for this team member.");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, unknown> = {
        name,
        roles: selectedRoles,
      };
      if (newPassword) {
        payload.newPassword = newPassword;
      }

      const res = await fetch(`/api/team/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to update user");
      } else {
        setSuccess(`Member ${name} updated successfully!${newPassword ? " Password was updated." : ""}`);
        setEditingUser(null);
        setNewPassword("");
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

  const filterTabs = [
    { key: "all", label: "All Staff" },
    { key: "owner", label: "Owner" },
    { key: "editor", label: "Editor" },
    { key: "designer", label: "Cover Designer" },
    { key: "production", label: "Production" },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner Notifications */}
      {success && (
        <div className="flex items-center justify-between rounded-2xl border border-success/30 bg-success/10 p-4 text-sm font-bold text-success">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-xs opacity-75 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm font-bold text-danger">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs opacity-75 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Team & Roles</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Manage publisher staff, assign multiple specialized roles (Editor, Designer, DTP, Proofreader, ISBN, Production), and control permissions.
          </p>
        </div>

        <button
          onClick={() => {
            setName("");
            setEmail("");
            setSelectedRoles(["editor"]);
            setPassword("");
            setError(null);
            setIsAddOpen(true);
          }}
          className="apple-button inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Search and Role Filter Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search members by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-surface px-4 py-2.5 pl-10 text-xs font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-white/10 dark:bg-surface"
          />
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filterTabs.map((item) => {
            const count =
              item.key === "all"
                ? users.length
                : users.filter((u) => hasRole(u.role, item.key as Role)).length;
            return (
              <button
                key={item.key}
                onClick={() => setSelectedFilterRole(item.key)}
                className={`apple-button rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedFilterRole === item.key
                    ? "bg-foreground text-background shadow-xs font-extrabold"
                    : "border border-black/8 bg-surface text-muted-foreground hover:bg-black/5 hover:text-foreground dark:border-white/10 dark:bg-surface-muted/50"
                }`}
              >
                {item.label}
                <span className={`ml-1.5 text-[10px] ${selectedFilterRole === item.key ? "opacity-80" : "opacity-60"}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor Assignment Rotation Queue Card */}
      {totalEditors > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-[#7e2562]/20 bg-gradient-to-br from-[#faedf5]/80 via-surface to-surface p-5 shadow-xs backdrop-blur-md dark:border-[#7e2562]/30 dark:from-[#7e2562]/10 dark:via-surface/50">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#7e2562]/15">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7e2562] text-white shadow-2xs">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                  Editor Round-Robin Rotation Queue
                  <span className="rounded-full bg-[#7e2562]/15 px-2 py-0.5 text-[11px] font-bold text-[#7e2562]">
                    {totalEditors} Active Editor{totalEditors > 1 ? "s" : ""}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Manuscripts are assigned automatically in sequential rotation ({activeEditors.map((_: TeamUser, i: number) => `${i + 1}/${totalEditors}`).join(" → ")}).
                </p>
              </div>
            </div>

            <button
              onClick={openOrderModal}
              className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/30 bg-white px-3.5 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#7e2562] hover:text-white transition-all cursor-pointer dark:bg-surface"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span>Set Editor Order ({totalEditors})</span>
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-2.5 overflow-x-auto pb-1">
            {activeEditors.map((editor: TeamUser, idx: number) => {
              const posLabel = `${idx + 1}/${totalEditors}`;
              const isNext = idx === nextEditorIndex;
              return (
                <div
                  key={editor.id}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-all ${
                    isNext
                      ? "border-[#7e2562] bg-[#7e2562] text-white shadow-plum-sm ring-2 ring-[#7e2562]/25"
                      : "border-black/8 bg-white/80 text-foreground dark:border-white/10 dark:bg-surface"
                  }`}
                >
                  <span
                    className={`flex h-6 min-w-[34px] items-center justify-center rounded-lg text-xs font-black ${
                      isNext
                        ? "bg-white/20 text-white"
                        : "bg-[#7e2562]/10 text-[#7e2562]"
                    }`}
                  >
                    {posLabel}
                  </span>
                  <span className="text-xs font-bold whitespace-nowrap">{editor.name}</span>
                  {isNext && (
                    <span className="rounded-full bg-white text-[#7e2562] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                      Next Up
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Members Bento Table */}
      <section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-surface/90 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-black/[0.02] text-xs font-bold tracking-wider text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.02]">
              <tr>
                <th className="px-6 py-4.5 whitespace-nowrap">Member</th>
                <th className="px-6 py-4.5 whitespace-nowrap">Assigned Roles</th>
                <th className="px-6 py-4.5 whitespace-nowrap">Email</th>
                <th className="px-6 py-4.5 whitespace-nowrap">Submissions</th>
                <th className="px-6 py-4.5 whitespace-nowrap">Status</th>
                <th className="px-6 py-4.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {(() => {
                const filteredUsers = users
                  .filter((user: TeamUser) => {
                    const matchesSearch =
                      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.email.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesRole =
                      selectedFilterRole === "all" || hasRole(user.role, selectedFilterRole as Role);
                    return matchesSearch && matchesRole;
                  })
                  .sort((a: TeamUser, b: TeamUser) => {
                    if (a.active !== b.active) {
                      return a.active ? -1 : 1;
                    }
                    return 0;
                  });

                if (filteredUsers.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <p className="text-sm font-semibold text-foreground">No team members found</p>
                        <p className="mt-1 text-xs">Try adjusting your search query or role filter.</p>
                      </td>
                    </tr>
                  );
                }

                return filteredUsers.map((user: TeamUser) => {
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
                                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground dark:bg-white/10">
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

                      {/* Role Badges */}
                      <td className="px-6 py-4.5 max-w-xs">
                        {renderRoleBadges(user.role)}
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
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                            user.active
                              ? "bg-success/10 text-success"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${user.active ? "bg-success" : "bg-danger"}`} />
                          {user.active ? "Active" : "Deactivated"}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setName(user.name);
                              const roles = parseUserRoles(user.role).filter(
                                (r): r is StaffRole => r !== "author"
                              );
                              setSelectedRoles(roles.length > 0 ? roles : ["editor"]);
                              setNewPassword("");
                              setError(null);
                              setEditingUser(user);
                            }}
                            className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/25 bg-white px-3.5 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#7e2562] hover:text-white hover:border-[#7e2562] hover:shadow-plum-sm transition-all cursor-pointer group"
                          >
                            <svg className="h-3.5 w-3.5 opacity-80 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span>Edit</span>
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => handleToggleActive(user)}
                              disabled={loading}
                              className={`apple-button inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                user.active
                                  ? "border-danger/20 text-danger hover:bg-danger hover:text-white dark:border-danger/30"
                                  : "border-success/20 text-success hover:bg-success hover:text-white dark:border-success/30"
                              }`}
                            >
                              {user.active ? "Deactivate" : "Reactivate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL 1: Add Team Member */}
      {isAddOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-black/10 bg-surface dark:border-white/15 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">Add Team Member</h3>
                <p className="text-xs text-muted-foreground">Create account credentials and assign multiple specialized roles.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4 overflow-y-auto">
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
                  placeholder="staff@kairalibooks.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-white/[0.03] dark:focus:bg-surface"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground/80">
                    Assigned Functional Roles <span className="text-primary font-bold">(Select 1 or more)</span>
                  </label>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {selectedRoles.length} selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {STAFF_ROLE_DEFINITIONS.map((r) => {
                    const isSelected = selectedRoles.includes(r.val);
                    return (
                      <button
                        key={r.val}
                        type="button"
                        onClick={() => toggleRole(r.val)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/5 text-foreground shadow-xs ring-1 ring-primary/20"
                            : "border-black/8 bg-surface text-muted-foreground hover:bg-black/5 hover:text-foreground dark:border-white/10 dark:bg-surface-muted/30"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-black/20 bg-white dark:border-white/20 dark:bg-surface"
                          }`}
                        >
                          {isSelected && (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-foreground block">{r.label}</span>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight mt-0.5">
                            {r.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
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
                  className="apple-button flex-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-xs font-bold text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="apple-button flex-1 rounded-xl bg-foreground py-2.5 text-xs font-bold text-background shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Creating..." : "Create Member"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Edit User Multi-Roles, Name & Password */}
      {editingUser && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-black/10 bg-surface dark:border-white/15 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">Edit Member Details & Roles</h3>
                <p className="text-xs text-muted-foreground">Assign or adjust specialized functional roles and permissions.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 overflow-y-auto">
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
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground/80">
                    Assigned Functional Roles <span className="text-primary font-bold">(Select multiple roles)</span>
                  </label>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {selectedRoles.length} active role(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {STAFF_ROLE_DEFINITIONS.map((r) => {
                    const isSelected = selectedRoles.includes(r.val);
                    return (
                      <button
                        key={r.val}
                        type="button"
                        onClick={() => toggleRole(r.val)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#7e2562] bg-[#faedf5] text-foreground shadow-xs ring-1 ring-[#7e2562]/30"
                            : "border-black/8 bg-surface text-muted-foreground hover:bg-black/5 hover:text-foreground dark:border-white/10 dark:bg-surface-muted/30"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            isSelected
                              ? "border-[#7e2562] bg-[#7e2562] text-white"
                              : "border-black/20 bg-white dark:border-white/20 dark:bg-surface"
                          }`}
                        >
                          {isSelected && (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-foreground block">{r.label}</span>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight mt-0.5">
                            {r.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Reset Password <span className="text-muted-foreground font-normal">(leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  minLength={8}
                  placeholder="Enter new password (min. 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-white/[0.03]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Updating password will terminate all active sessions for this member.
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
                  className="apple-button flex-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-xs font-bold text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="apple-button flex-1 rounded-xl bg-[#7e2562] py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-[#681d50] hover:shadow-plum transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: Configure Editor Rotation Order */}
      {isOrderModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-black/10 bg-surface dark:border-white/15 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">Editor Assignment Order</h3>
                <p className="text-xs text-muted-foreground">
                  Configure the sequential round-robin queue (1/{totalEditors}, 2/{totalEditors}, etc.)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="rounded-2xl border border-[#7e2562]/20 bg-[#faedf5]/60 p-3.5 text-xs text-[#7e2562] leading-relaxed dark:bg-[#7e2562]/10">
                Incoming manuscripts cycle automatically in this exact sequence:
                <strong className="block mt-1 text-[11px] font-mono">
                  {orderDraft.map((id, i) => {
                    const u = users.find((usr) => usr.id === id);
                    return `${i + 1}/${orderDraft.length} ${u?.name || "Editor"}`;
                  }).join(" ➔ ")} ➔ (repeat)
                </strong>
              </div>

              <div className="space-y-2">
                {orderDraft.map((editorId, idx) => {
                  const editor = users.find((u) => u.id === editorId);
                  if (!editor) return null;
                  const pos = idx + 1;
                  const isFirst = idx === 0;
                  const isLast = idx === orderDraft.length - 1;

                  return (
                    <div
                      key={editorId}
                      className="flex items-center justify-between p-3 rounded-2xl border border-black/8 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02] gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-8 w-12 items-center justify-center rounded-xl bg-[#7e2562] text-white text-xs font-black shrink-0 shadow-2xs">
                          {pos}/{orderDraft.length}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{editor.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{editor.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={pos}
                          onChange={(e) => setEditorPositionInDraft(editorId, Number(e.target.value))}
                          className="rounded-lg border border-black/12 bg-surface px-2 py-1 text-xs font-bold text-foreground outline-none dark:border-white/15 cursor-pointer"
                        >
                          {Array.from({ length: orderDraft.length }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              Pos {n}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => moveEditorInDraft(idx, idx - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-foreground hover:bg-black/5 disabled:opacity-30 dark:border-white/10 dark:bg-surface cursor-pointer font-bold"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => moveEditorInDraft(idx, idx + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-foreground hover:bg-black/5 disabled:opacity-30 dark:border-white/10 dark:bg-surface cursor-pointer font-bold"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-6 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className="apple-button flex-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-xs font-bold text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.04] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingOrder}
                onClick={() => handleSaveEditorOrder()}
                className="apple-button flex-1 rounded-xl bg-[#7e2562] py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-[#681d50] disabled:opacity-50 cursor-pointer"
              >
                {savingOrder ? "Saving..." : "Save Order"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
