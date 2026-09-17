"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { formatIST } from "@/lib/time";
import { SmoothDropdown } from "@/components/dropdown";
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  User,
  Shield,
  Layers,
  FileText,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BookOpen,
  Send,
  SlidersHorizontal,
  X,
  Code,
  Sparkles,
  Info,
  Tag,
} from "lucide-react";

export type AuditLogRecord = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string | null;
  at: string;
  user_id: string | null;
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

export type EntityLookup = {
  authors: Record<string, string>;
  titles: Record<string, string>;
  submissions: Record<string, { title: string; author_name: string; ref_no: string }>;
  contracts: Record<string, { title: string; author: string }>;
  production: Record<string, { title: string }>;
  users: Record<string, { name: string; role: string; email: string }>;
};

// ── Log Categorization Definitions ──────────────────────────────────────────
export type CategoryKey =
  | "all"
  | "submissions"
  | "production"
  | "contracts"
  | "authors"
  | "team_security"
  | "catalog_stock"
  | "system";

export const CATEGORIES: {
  key: CategoryKey;
  label: string;
  badgeClass: string;
  iconBg: string;
}[] = [
  {
    key: "all",
    label: "All Categories",
    badgeClass: "bg-[#7e2562]/10 text-[#7e2562] border-[#7e2562]/20",
    iconBg: "bg-[#7e2562]/10 text-[#7e2562]",
  },
  {
    key: "submissions",
    label: "Manuscripts & Submissions",
    badgeClass: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
    iconBg: "bg-blue-500/10 text-blue-600",
  },
  {
    key: "production",
    label: "Production & Print",
    badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
    iconBg: "bg-amber-500/10 text-amber-600",
  },
  {
    key: "contracts",
    label: "Contracts & Legal",
    badgeClass: "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-300",
    iconBg: "bg-purple-500/10 text-purple-600",
  },
  {
    key: "authors",
    label: "Authors & Onboarding",
    badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
    iconBg: "bg-emerald-500/10 text-emerald-600",
  },
  {
    key: "team_security",
    label: "Team & Security",
    badgeClass: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300",
    iconBg: "bg-rose-500/10 text-rose-600",
  },
  {
    key: "catalog_stock",
    label: "Catalog & Stock",
    badgeClass: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:text-cyan-300",
    iconBg: "bg-cyan-500/10 text-cyan-600",
  },
  {
    key: "system",
    label: "System & Core",
    badgeClass: "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-300",
    iconBg: "bg-slate-500/10 text-slate-600",
  },
];

export function categorizeLog(action: string, entity: string): CategoryKey {
  const a = action.toLowerCase();
  const e = entity.toLowerCase();

  if (e.includes("submission") || a.includes("submission") || a.includes("manuscript")) {
    return "submissions";
  }
  if (
    e.includes("production") ||
    e.includes("print") ||
    a.includes("production") ||
    a.includes("dtp") ||
    a.includes("editing") ||
    a.includes("cover") ||
    a.includes("isbn") ||
    a.includes("proof") ||
    a.includes("printing") ||
    a.includes("handover") ||
    a.includes("post_production")
  ) {
    return "production";
  }
  if (e.includes("contract") || a.includes("contract") || a.includes("sign")) {
    return "contracts";
  }
  if (e.includes("author") || a.includes("author")) {
    return "authors";
  }
  if (
    e.includes("user") ||
    a.includes("login") ||
    a.includes("logout") ||
    a.includes("user") ||
    a.includes("password") ||
    a.includes("profile") ||
    a.includes("role")
  ) {
    return "team_security";
  }
  if (e.includes("title") || e.includes("stock") || a.includes("title") || a.includes("stock") || a.includes("inventory")) {
    return "catalog_stock";
  }
  return "system";
}

export function formatActionName(action: string): string {
  const map: Record<string, string> = {
    submission_received: "Submission Received",
    decline_submission: "Submission Declined",
    request_submission_revision: "Revision Requested",
    accept_submission: "Submission Accepted",
    reassign_submission: "Submission Reassigned",
    sign_contract_publisher: "Publisher Signed Contract",
    sign_contract_author: "Author Signed Contract",
    author_signed_contract: "Author Signed Contract",
    author_upload_revision: "Author Uploaded Revision",
    author_reject_proof: "Author Rejected Proof",
    author_approve_proof: "Author Approved Proof",
    author_approve_final_proof: "Author Final Proof Approved",
    author_request_proof_rework: "Author Requested Proof Rework",
    author_signup_and_onboarding: "Author Onboarding & Registration",
    author_account_setup: "Author Account Setup",
    complete_production_dtp: "Completed DTP Typesetting",
    complete_production_editing: "Completed Proofreading & Editing",
    complete_production_cover: "Completed Cover Artwork",
    submit_isbn_request: "Submitted ISBN Application",
    complete_production_isbn: "Registered ISBN Catalog Record",
    request_proof_rework: "Requested Proof Revisions",
    approve_production_proof: "Approved Production Proof",
    complete_production_printing: "Completed Printing Run",
    complete_post_production_and_handover: "Post-Production Warehouse Inward",
    dispatch_author_copies: "Dispatched Author Copies",
    send_proof_email: "Dispatched Proof Notification Email",
    update_production_schedule: "Updated Production Schedule",
    create_user: "Created Team Account",
    update_user: "Updated User Account",
    reset_user_password: "Reset Account Password",
    update_profile: "Updated Profile",
    create_author: "Created Author Profile",
    update_author: "Updated Author Details",
    delete_author: "Deleted Author Record",
    login: "User Logged In",
    logout: "User Logged Out",
  };

  if (map[action]) return map[action];
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Helper to resolve human-readable entity name from entity ID */
export function resolveEntityDisplayName(
  entity: string,
  entityId: string | null,
  lookup: EntityLookup
): { name: string; subtitle?: string } | null {
  if (!entityId) return null;

  const ent = entity.toLowerCase();

  // Author resolution
  if (ent === "author" || lookup.authors[entityId]) {
    const authorName = lookup.authors[entityId];
    if (authorName) return { name: authorName, subtitle: "Author Record" };
  }

  // Title / Book resolution
  if (ent === "title" || lookup.titles[entityId]) {
    const titleName = lookup.titles[entityId];
    if (titleName) return { name: titleName, subtitle: "Book Catalog Record" };
  }

  // Submission resolution
  if (ent === "submission" || lookup.submissions[entityId]) {
    const sub = lookup.submissions[entityId];
    if (sub) {
      return {
        name: sub.title,
        subtitle: `By ${sub.author_name} · ${sub.ref_no}`,
      };
    }
  }

  // Contract resolution
  if (ent === "contract" || lookup.contracts[entityId]) {
    const con = lookup.contracts[entityId];
    if (con) {
      return {
        name: con.title,
        subtitle: `Author: ${con.author}`,
      };
    }
  }

  // Production project resolution
  if (ent === "production" || ent === "production_job" || lookup.production[entityId]) {
    const prod = lookup.production[entityId];
    if (prod) {
      return {
        name: prod.title,
        subtitle: "Production Project",
      };
    }
  }

  // User account resolution
  if (ent === "user" || lookup.users[entityId]) {
    const u = lookup.users[entityId];
    if (u) {
      const formattedRole = u.role
        ? u.role
            .split(",")
            .map((r) => r.trim().replace(/\b\w/g, (c) => c.toUpperCase()))
            .join(", ")
        : "";
      return {
        name: u.name,
        subtitle: formattedRole ? `${formattedRole} · ${u.email}` : u.email,
      };
    }
  }

  // Universal Fallback Check across all dictionaries
  if (lookup.titles[entityId]) return { name: lookup.titles[entityId], subtitle: "Title" };
  if (lookup.authors[entityId]) return { name: lookup.authors[entityId], subtitle: "Author" };
  if (lookup.users[entityId]) return { name: lookup.users[entityId].name, subtitle: lookup.users[entityId].role };

  return null;
}

/** Helper to format key names into readable labels */
function formatFieldLabel(key: string): string {
  const map: Record<string, string> = {
    ref_no: "Submission Ref No",
    contract_ref: "Contract Reference",
    title: "Book / Manuscript Title",
    title_id: "Book / Title",
    author_id: "Author",
    author_name: "Author Name",
    author_email: "Author Email",
    submission_id: "Manuscript Submission",
    contract_id: "Publishing Contract",
    production_id: "Production Project",
    user_id: "User Account",
    reviewer: "Reviewer",
    signer: "Signatory Name",
    signer_name: "Signatory Name",
    feedback: "Review Feedback",
    feedback_summary: "Feedback Summary",
    reason: "Reason / Note",
    notes: "Notes",
    status: "Status",
    step: "Milestone Step",
    copies_count: "Print Copies Count",
    quantity: "Quantity",
    warehouse_bin: "Warehouse Storage Bin",
    ip: "Client IP Address",
    role: "User Role",
    new_role: "New Assigned Role",
    email: "Email Address",
    name: "Full Name",
    name_ml: "Name in Malayalam",
    isbn: "ISBN Number",
    deadline: "Target Deadline",
    advance_amount: "Advance Amount",
    royalty_pct: "Royalty Percentage",
  };

  if (map[key]) return map[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  new: { label: "Pending Review", className: "bg-amber-50 text-amber-800 border-amber-300 font-bold" },
  pending_review: { label: "Pending Review", className: "bg-amber-50 text-amber-800 border-amber-300 font-bold" },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-800 border-amber-300 font-bold" },
  under_review: { label: "Under Review", className: "bg-blue-50 text-blue-800 border-blue-300 font-bold" },
  in_review: { label: "Under Review", className: "bg-blue-50 text-blue-800 border-blue-300 font-bold" },
  needs_revision: { label: "Needs Revision", className: "bg-orange-50 text-orange-800 border-orange-300 font-bold" },
  accepted: { label: "Accepted", className: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-2xs" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-2xs" },
  active: { label: "Active", className: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-2xs" },
  completed: { label: "Completed / Live", className: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-2xs" },
  declined: { label: "Declined", className: "bg-rose-50 text-rose-800 border-rose-300 font-bold" },
  rejected: { label: "Declined", className: "bg-rose-50 text-rose-800 border-rose-300 font-bold" },
  cancelled: { label: "Cancelled", className: "bg-rose-50 text-rose-800 border-rose-300 font-bold" },
  in_progress: { label: "In Progress", className: "bg-purple-50 text-purple-700 border-purple-300 font-bold" },
  under_contract: { label: "Under Contract", className: "bg-slate-100 text-slate-700 border-slate-300 font-bold" },
  dtp: { label: "DTP (Typesetting)", className: "bg-sky-50 text-sky-800 border-sky-300 font-bold" },
  editing: { label: "Editing & Proofreading", className: "bg-amber-50 text-amber-800 border-amber-300 font-bold" },
  cover_design: { label: "Cover Design", className: "bg-pink-50 text-pink-800 border-pink-300 font-bold" },
  isbn_registration: { label: "ISBN Registration", className: "bg-blue-50 text-blue-800 border-blue-300 font-bold" },
  final_proof: { label: "Author Final Proof", className: "bg-orange-50 text-orange-800 border-orange-300 font-bold" },
  printing: { label: "Printing Run", className: "bg-[#faedf5] text-[#7e2562] border-[#7e2562]/35 font-bold" },
  post_production: { label: "Post-Production Intake", className: "bg-teal-50 text-teal-800 border-teal-300 font-bold" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-700 border-gray-200 font-semibold" },
  withdrawn: { label: "Withdrawn", className: "bg-gray-100 text-gray-700 border-gray-200 font-semibold" },
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200 font-semibold" },
};

export function getStatusBadge(key: string, val: any): { label: string; className: string } | null {
  if (val === null || val === undefined) return null;
  const normKey = key.toLowerCase();
  const strVal = String(val).toLowerCase().trim();

  if (STATUS_BADGE_MAP[strVal]) {
    return STATUS_BADGE_MAP[strVal];
  }
  if (normKey === "status" || normKey.endsWith("_status") || normKey === "state") {
    return {
      label: strVal.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      className: "bg-slate-100 text-slate-700 border border-slate-300 font-bold",
    };
  }
  return null;
}

/** Helper to resolve human-readable values in payload detail fields */
function resolveFieldValue(
  key: string,
  val: any,
  lookup: EntityLookup
): { display: string; rawId?: string } {
  if (val === null || val === undefined) {
    return { display: "None" };
  }
  if (typeof val === "boolean") {
    return { display: val ? "Yes" : "No" };
  }
  if (typeof val === "number") {
    return { display: String(val) };
  }
  if (typeof val === "object") {
    return { display: JSON.stringify(val) };
  }

  const str = String(val).trim();

  // Author check
  if ((key.includes("author") || key === "author_id") && lookup.authors[str]) {
    return { display: lookup.authors[str], rawId: str };
  }

  // Title check
  if ((key.includes("title") || key === "title_id") && lookup.titles[str]) {
    return { display: lookup.titles[str], rawId: str };
  }

  // Submission check
  if ((key.includes("submission") || key === "submission_id") && lookup.submissions[str]) {
    const sub = lookup.submissions[str];
    return { display: `${sub.title} (by ${sub.author_name})`, rawId: str };
  }

  // Contract check
  if ((key.includes("contract") || key === "contract_id") && lookup.contracts[str]) {
    const con = lookup.contracts[str];
    return { display: `${con.title} · Author: ${con.author}`, rawId: str };
  }

  // User check
  if ((key.includes("user") || key.includes("reviewer") || key.includes("signer") || key.includes("assigned")) && lookup.users[str]) {
    const u = lookup.users[str];
    return { display: `${u.name} (${u.role})`, rawId: str };
  }

  // Universal lookup match
  if (lookup.titles[str]) return { display: lookup.titles[str], rawId: str };
  if (lookup.authors[str]) return { display: lookup.authors[str], rawId: str };
  if (lookup.users[str]) return { display: `${lookup.users[str].name} (${lookup.users[str].role})`, rawId: str };

  return { display: str };
}

type SortField = "at" | "action" | "actor" | "category" | "entity";
type SortDirection = "asc" | "desc";

export default function ActivityClient({
  initialLogs,
  currentUserRole,
  entityLookup,
}: {
  initialLogs: AuditLogRecord[];
  currentUserRole: string;
  entityLookup: EntityLookup;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("all");
  const [selectedActor, setSelectedActor] = useState<string>("all");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("all");

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Inspector Modal state & payload view mode toggle
  const [inspectItem, setInspectItem] = useState<AuditLogRecord | null>(null);
  const [payloadViewMode, setPayloadViewMode] = useState<"formatted" | "raw">("formatted");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lock body scroll and handle Escape when modal is open
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setInspectItem(null);
    }
    if (inspectItem) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [inspectItem]);

  // Copy helper
  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Unique Actors list for dropdown
  const uniqueActors = useMemo(() => {
    const map = new Map<string, string>();
    initialLogs.forEach((log) => {
      if (log.users) {
        map.set(log.users.id, `${log.users.name} (${log.users.role})`);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [initialLogs]);

  // Unique Entity types for dropdown
  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    initialLogs.forEach((log) => {
      if (log.entity) set.add(log.entity);
    });
    return Array.from(set).sort();
  }, [initialLogs]);

  // Count by category for tab badges
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      all: initialLogs.length,
      submissions: 0,
      production: 0,
      contracts: 0,
      authors: 0,
      team_security: 0,
      catalog_stock: 0,
      system: 0,
    };
    initialLogs.forEach((log) => {
      const cat = categorizeLog(log.action, log.entity);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [initialLogs]);

  // KPI Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const uniqueUsersSet = new Set<string>();
    let todayCount = 0;

    initialLogs.forEach((log) => {
      if (log.at.startsWith(todayStr)) todayCount++;
      if (log.user_id) uniqueUsersSet.add(log.user_id);
    });

    return {
      total: initialLogs.length,
      today: todayCount,
      actorsCount: uniqueUsersSet.size,
      topCategory: "Submissions & Production",
    };
  }, [initialLogs]);

  // Filtered and Sorted Logs
  const filteredLogs = useMemo(() => {
    let result = [...initialLogs];

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((log) => categorizeLog(log.action, log.entity) === selectedCategory);
    }

    // Actor filter
    if (selectedActor !== "all") {
      if (selectedActor === "__system__") {
        result = result.filter((log) => !log.user_id);
      } else {
        result = result.filter((log) => log.user_id === selectedActor);
      }
    }

    // Entity filter
    if (selectedEntity !== "all") {
      result = result.filter((log) => log.entity === selectedEntity);
    }

    // Timeframe filter
    if (selectedTimeframe !== "all") {
      const now = new Date();
      if (selectedTimeframe === "today") {
        const todayStr = now.toISOString().slice(0, 10);
        result = result.filter((log) => log.at.startsWith(todayStr));
      } else if (selectedTimeframe === "7days") {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const limitStr = d.toISOString().slice(0, 19).replace("T", " ");
        result = result.filter((log) => log.at >= limitStr);
      } else if (selectedTimeframe === "30days") {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const limitStr = d.toISOString().slice(0, 19).replace("T", " ");
        result = result.filter((log) => log.at >= limitStr);
      }
    }

    // Text Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((log) => {
        const actorName = log.users?.name?.toLowerCase() ?? "system";
        const actorEmail = log.users?.email?.toLowerCase() ?? "";
        const actionFormatted = formatActionName(log.action).toLowerCase();
        const actionRaw = log.action.toLowerCase();
        const entity = log.entity.toLowerCase();
        const entityId = (log.entity_id || "").toLowerCase();
        const detail = (log.detail || "").toLowerCase();

        // Also match human-readable entity name in search
        const resolved = resolveEntityDisplayName(log.entity, log.entity_id, entityLookup);
        const resolvedName = (resolved?.name || "").toLowerCase();
        const resolvedSubtitle = (resolved?.subtitle || "").toLowerCase();

        return (
          actorName.includes(q) ||
          actorEmail.includes(q) ||
          actionFormatted.includes(q) ||
          actionRaw.includes(q) ||
          entity.includes(q) ||
          entityId.includes(q) ||
          detail.includes(q) ||
          resolvedName.includes(q) ||
          resolvedSubtitle.includes(q)
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "at") {
        comparison = a.at.localeCompare(b.at);
      } else if (sortField === "action") {
        comparison = formatActionName(a.action).localeCompare(formatActionName(b.action));
      } else if (sortField === "actor") {
        const nameA = a.users?.name ?? "System";
        const nameB = b.users?.name ?? "System";
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === "category") {
        const catA = categorizeLog(a.action, a.entity);
        const catB = categorizeLog(b.action, b.entity);
        comparison = catA.localeCompare(catB);
      } else if (sortField === "entity") {
        comparison = (a.entity || "").localeCompare(b.entity || "");
      }
      return sortDir === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    initialLogs,
    selectedCategory,
    selectedActor,
    selectedEntity,
    selectedTimeframe,
    searchQuery,
    sortField,
    sortDir,
    entityLookup,
  ]);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedActor, selectedEntity, selectedTimeframe, searchQuery, pageSize]);

  // Paginated Slice
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedActor !== "all" ||
    selectedEntity !== "all" ||
    selectedTimeframe !== "all" ||
    searchQuery.trim().length > 0;

  function handleResetFilters() {
    setSelectedCategory("all");
    setSelectedActor("all");
    setSelectedEntity("all");
    setSelectedTimeframe("all");
    setSearchQuery("");
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // Export CSV
  function handleExportCSV() {
    const headers = [
      "Event ID",
      "Timestamp (IST)",
      "Action",
      "Category",
      "Entity Type",
      "Entity Display Name",
      "Entity ID",
      "Actor Name",
      "Actor Email",
      "Actor Role",
      "Detail Payload",
    ];
    const rows = filteredLogs.map((log) => {
      const resolved = resolveEntityDisplayName(log.entity, log.entity_id, entityLookup);
      return [
        `"${log.id}"`,
        `"${formatIST(log.at)}"`,
        `"${formatActionName(log.action)}"`,
        `"${categorizeLog(log.action, log.entity)}"`,
        `"${log.entity}"`,
        `"${resolved?.name || ""}"`,
        `"${log.entity_id || ""}"`,
        `"${log.users?.name || "System"}"`,
        `"${log.users?.email || ""}"`,
        `"${log.users?.role || "system"}"`,
        `"${(log.detail || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kairali_activity_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Parse detail payload into structured key-values
  const parsedDetailEntries = useMemo(() => {
    if (!inspectItem?.detail) return null;
    try {
      const parsed = JSON.parse(inspectItem.detail);
      if (typeof parsed === "object" && parsed !== null) {
        return Object.entries(parsed);
      }
      return null;
    } catch {
      return null;
    }
  }, [inspectItem]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Activity Logs
          </h1>
          <p className="mt-1 text-base max-w-xl text-muted-foreground">
            Complete tamper-evident audit ledger and system events across manuscripts, production, contracts, team, and security.
          </p>
        </div>

        {/* <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="apple-button inline-flex items-center gap-2 rounded-xl border border-[#7e2562]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] transition-colors"
          >
            <Download className="h-4 w-4 text-[#7e2562]" />
            <span>Export CSV</span>
          </button>
          <Link
            href="/dashboard"
            className="apple-button inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-primary-hover transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div> */}
      </header>

   

      {/* Category Tabs Pill Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.key] || 0;
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`apple-button shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#7e2562] text-white shadow-plum-sm"
                  : "border border-[#7e2562]/15 bg-white text-muted-foreground hover:border-[#7e2562]/30 hover:bg-[#faedf5]/40 hover:text-foreground"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                  isActive ? "bg-white/20 text-white" : "bg-[#7e2562]/10 text-[#7e2562]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Toolbar */}
      <section className={`rounded-xl border bg-white p-4 transition-all duration-200 space-y-3 ${
        hasActiveFilters ? "border-[#7e2562]/35 shadow-plum-md" : "border-[#7e2562]/15 shadow-plum-sm"
      }`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Search Bar */}
          <div className="relative lg:col-span-4">
            <input
              type="text"
              placeholder="Search by actor, action, book, author name or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-slate-50/70 px-4 py-2 pl-10 text-xs font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[#7e2562] focus:bg-white focus:ring-2 focus:ring-[#7e2562]/10"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Actor Select */}
          <div className="lg:col-span-3">
            <SmoothDropdown
              size="sm"
              value={selectedActor}
              onChange={setSelectedActor}
              ariaLabel="Filter by actor"
              buttonClassName={
                selectedActor && selectedActor !== "all"
                  ? "!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
                  : ""
              }
              options={[
                { value: "all", label: "All Actors / Users" },
                { value: "__system__", label: "System (Automated)" },
                ...uniqueActors.map((u) => ({ value: u.id, label: u.label })),
              ]}
            />
          </div>

          {/* Entity Type Select */}
          <div className="lg:col-span-3">
            <SmoothDropdown
              size="sm"
              value={selectedEntity}
              onChange={setSelectedEntity}
              ariaLabel="Filter by entity type"
              buttonClassName={
                selectedEntity && selectedEntity !== "all"
                  ? "!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
                  : ""
              }
              options={[
                { value: "all", label: "All Entity Types" },
                ...uniqueEntities.map((ent) => ({
                  value: ent,
                  label: `Entity: ${ent.replace(/_/g, " ").toUpperCase()}`,
                })),
              ]}
            />
          </div>

          {/* Timeframe Select */}
          <div className="lg:col-span-2">
            <SmoothDropdown
              size="sm"
              value={selectedTimeframe}
              onChange={setSelectedTimeframe}
              ariaLabel="Filter by timeframe"
              buttonClassName={
                selectedTimeframe && selectedTimeframe !== "all"
                  ? "!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
                  : ""
              }
              options={[
                { value: "all", label: "All Time" },
                { value: "today", label: "Today" },
                { value: "7days", label: "Last 7 Days" },
                { value: "30days", label: "Last 30 Days" },
              ]}
            />
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.05] pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              Showing <strong className="font-bold text-foreground">{filteredLogs.length}</strong> of{" "}
              {initialLogs.length} events
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#7e2562]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#7e2562]">
                <Filter className="h-3 w-3" />
                Filtered
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5]/30 px-3 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/40 transition-all cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-xs">Per page:</span>
              <div className="w-20">
                <SmoothDropdown
                  size="sm"
                  value={String(pageSize)}
                  onChange={(val) => setPageSize(Number(val))}
                  ariaLabel="Select items per page"
                  options={[
                    { value: "15", label: "15" },
                    { value: "25", label: "25" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Activity Table Card */}
      <section className="overflow-hidden rounded-3xl border border-[#7e2562]/12 bg-white shadow-plum-sm">
        {paginatedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7e2562]/8 text-[#7e2562]">
              <Layers className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No matching activity logs found</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Try modifying your search criteria, clearing active filters, or changing the selected category.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="apple-button mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#7e2562] px-4 py-2 text-xs font-bold text-white shadow-plum-sm hover:bg-[#681c50]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#7e2562]/10 bg-[#faedf5]/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th
                    onClick={() => toggleSort("at")}
                    className="cursor-pointer py-3.5 pl-6 pr-4 transition-colors hover:text-[#7e2562]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Timestamp</span>
                      {sortField === "at" ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-[#7e2562]" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-[#7e2562]" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort("actor")}
                    className="cursor-pointer py-3.5 px-4 transition-colors hover:text-[#7e2562]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Actor / User</span>
                      {sortField === "actor" ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-[#7e2562]" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-[#7e2562]" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort("action")}
                    className="cursor-pointer py-3.5 px-4 transition-colors hover:text-[#7e2562]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Action &amp; Category</span>
                      {sortField === "action" ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-[#7e2562]" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-[#7e2562]" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort("entity")}
                    className="cursor-pointer py-3.5 px-4 transition-colors hover:text-[#7e2562]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Target Entity</span>
                      {sortField === "entity" ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-[#7e2562]" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-[#7e2562]" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Detail Preview</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7e2562]/8">
                {paginatedLogs.map((row) => {
                  const category = categorizeLog(row.action, row.entity);
                  const catDef = CATEGORIES.find((c) => c.key === category) || CATEGORIES[CATEGORIES.length - 1];
                  const resolvedEntity = resolveEntityDisplayName(row.entity, row.entity_id, entityLookup);

                  return (
                    <tr
                      key={row.id}
                      className="group transition-colors hover:bg-[#faedf5]/30 cursor-pointer"
                      onClick={() => setInspectItem(row)}
                    >
                      {/* Timestamp */}
                      <td className="py-4 pl-6 pr-4 align-top">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#7e2562] ring-4 ring-[#faedf5]" />
                          <div>
                            <p className="font-bold text-foreground text-xs">{formatIST(row.at)}</p>
                            <p className="mt-0.5 text-[11px] font-mono text-muted-foreground/80">{row.at.slice(11, 19)} UTC</p>
                          </div>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#7e2562]/10 font-bold text-xs text-[#7e2562]">
                            {row.users?.name ? row.users.name.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-xs truncate">
                              {row.users?.name ?? "System Automated"}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {row.users ? (
                                <span className="capitalize font-semibold text-primary/80">{row.users.role}</span>
                              ) : (
                                "System Cron / Daemon"
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Action & Category */}
                      <td className="py-4 px-4 align-top">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground text-xs">
                              {formatActionName(row.action)}
                            </p>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${catDef.badgeClass}`}
                            >
                              {catDef.label}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground/60">{row.action}</span>
                          </div>
                        </div>
                      </td>

                      {/* Entity Target with Human-Readable Name */}
                      <td className="py-4 px-4 align-top">
                        <div className="max-w-[220px]">
                          {resolvedEntity ? (
                            <div>
                              <p className="font-bold text-xs text-foreground truncate" title={resolvedEntity.name}>
                                {resolvedEntity.name}
                              </p>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="inline-flex items-center rounded bg-[#7e2562]/8 px-1.5 py-0.2 text-[10px] font-bold uppercase text-[#7e2562]">
                                  {row.entity}
                                </span>
                                {resolvedEntity.subtitle && (
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {resolvedEntity.subtitle}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center rounded-md border border-black/10 bg-black/[0.03] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                {row.entity}
                              </span>
                              {row.entity_id && (
                                <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
                                  {row.entity_id}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Detail Preview */}
                      <td className="py-4 px-4 align-top">
                        {row.detail ? (
                          <div className="max-w-xs truncate font-mono text-[11px] text-muted-foreground bg-slate-50 border border-black/5 rounded-lg px-2.5 py-1">
                            {row.detail}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 italic">—</span>
                        )}
                      </td>

                      {/* Inspect Action */}
                      <td className="py-4 pl-4 pr-6 align-top text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectItem(row);
                          }}
                          className="apple-button inline-flex items-center gap-1 rounded-lg border border-[#7e2562]/20 bg-[#faedf5]/60 px-2.5 py-1 text-xs font-bold text-[#7e2562] opacity-80 group-hover:opacity-100 hover:bg-[#faedf5]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Bar */}
        {filteredLogs.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#7e2562]/10 bg-white px-6 py-4 sm:flex-row">
            <span className="text-xs font-medium text-muted-foreground">
              Showing <strong className="font-bold text-foreground">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
              <strong className="font-bold text-foreground">
                {Math.min(currentPage * pageSize, filteredLogs.length)}
              </strong>{" "}
              of <strong className="font-bold text-foreground">{filteredLogs.length}</strong> events
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="apple-button rounded-xl border border-black/10 bg-white p-2 text-xs font-bold text-muted-foreground disabled:opacity-40 hover:bg-slate-50 transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="apple-button rounded-xl border border-black/10 bg-white p-2 text-xs font-bold text-muted-foreground disabled:opacity-40 hover:bg-slate-50 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-3 text-xs font-bold text-foreground">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="apple-button rounded-xl border border-black/10 bg-white p-2 text-xs font-bold text-muted-foreground disabled:opacity-40 hover:bg-slate-50 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="apple-button rounded-xl border border-black/10 bg-white p-2 text-xs font-bold text-muted-foreground disabled:opacity-40 hover:bg-slate-50 transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Inspect Event Modal Drawer via Portal */}
      {inspectItem &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-apple-in"
            onClick={() => setInspectItem(null)}
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#7e2562]/20 bg-white p-6 sm:p-7 shadow-2xl space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-black/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7e2562]/10 text-[#7e2562]">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold text-foreground">
                        {formatActionName(inspectItem.action)}
                      </h3>
                      {(() => {
                        const cat = categorizeLog(inspectItem.action, inspectItem.entity);
                        const catDef = CATEGORIES.find((c) => c.key === cat) || CATEGORIES[CATEGORIES.length - 1];
                        return (
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${catDef.badgeClass}`}
                          >
                            {catDef.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="mt-0.5 text-xs font-mono text-muted-foreground">
                      Action: {inspectItem.action}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectItem(null)}
                  className="apple-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-muted-foreground hover:bg-slate-200 hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Event Metadata Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Event ID */}
                <div className="rounded-2xl border border-black/8 bg-slate-50/90 p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Audit Log ID
                  </span>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-black/8 bg-white px-3 py-2">
                    <span className="font-mono text-xs font-semibold text-foreground break-all select-all">
                      {inspectItem.id}
                    </span>
                    <button
                      onClick={() => handleCopy(inspectItem.id, "modal-id")}
                      className="shrink-0 p-1 text-muted-foreground hover:text-foreground rounded hover:bg-black/5 transition-colors"
                      title="Copy Log ID"
                    >
                      {copiedId === "modal-id" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="rounded-2xl border border-black/8 bg-slate-50/90 p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Timestamp (IST / UTC)
                  </span>
                  <div className="rounded-xl border border-black/8 bg-white px-3 py-2">
                    <p className="text-xs font-bold text-foreground">{formatIST(inspectItem.at)}</p>
                    <p className="mt-0.5 text-[11px] font-mono text-muted-foreground">
                      {inspectItem.at} UTC
                    </p>
                  </div>
                </div>

                {/* Actor Card */}
                <div className="rounded-2xl border border-black/8 bg-slate-50/90 p-4 space-y-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Actor Information
                    </span>
                    {inspectItem.users?.role && (
                      <span className="inline-flex items-center rounded-md bg-[#7e2562]/10 px-1.5 py-0.5 text-[10px] font-bold capitalize text-[#7e2562]">
                        {inspectItem.users.role.split(",")[0].trim()}
                      </span>
                    )}
                  </div>
                  <div className="rounded-xl border border-black/8 bg-white px-3 py-2 space-y-0.5">
                    <p className="text-xs font-bold text-foreground">
                      {inspectItem.users?.name ?? "System Automated"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate" title={inspectItem.users ? inspectItem.users.email : "Automated background job"}>
                      {inspectItem.users ? inspectItem.users.email : "Automated background job"}
                    </p>
                  </div>
                </div>

                {/* Target Entity with Resolved Human-Readable Name */}
                <div className="rounded-2xl border border-black/8 bg-slate-50/90 p-4 space-y-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Target Entity
                    </span>
                    <span className="inline-flex items-center rounded-md border border-black/10 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-foreground shadow-2xs">
                      {inspectItem.entity.replace(/_/g, " ")}
                    </span>
                  </div>
                  {(() => {
                    const resolved = resolveEntityDisplayName(
                      inspectItem.entity,
                      inspectItem.entity_id,
                      entityLookup
                    );
                    return (
                      <div className="rounded-xl border border-black/8 bg-white px-3 py-2 space-y-1.5">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground">
                            {resolved ? resolved.name : `${inspectItem.entity.replace(/_/g, " ")} Record`}
                          </p>
                          {resolved?.subtitle && (
                            <p className="text-[11px] text-muted-foreground truncate" title={resolved.subtitle}>
                              {resolved.subtitle}
                            </p>
                          )}
                        </div>

                        {inspectItem.entity_id && (
                          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-black/5 mt-1">
                            <span className="font-mono text-[10px] text-muted-foreground truncate select-all">
                              ID: {inspectItem.entity_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(inspectItem.entity_id!, "modal-ent-id")}
                              className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground rounded hover:bg-black/5 transition-colors cursor-pointer"
                              title="Copy Entity ID"
                            >
                              {copiedId === "modal-ent-id" ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Event Detail Payload - Human Friendly Card View + Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Event Details &amp; Payload
                    </span>
                    {parsedDetailEntries && parsedDetailEntries.length > 0 && (
                      <div className="inline-flex items-center rounded-lg border border-black/10 bg-slate-100 p-0.5 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setPayloadViewMode("formatted")}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition-all ${
                            payloadViewMode === "formatted"
                              ? "bg-white text-foreground shadow-2xs font-extrabold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span></span>
                        </button>
                       
                      </div>
                    )}
                  </div>

         
                </div>

                {inspectItem.detail ? (
                  payloadViewMode === "formatted" && parsedDetailEntries && parsedDetailEntries.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {parsedDetailEntries.map(([key, val]) => {
                        const { display, rawId } = resolveFieldValue(key, val, entityLookup);
                        const label = formatFieldLabel(key);
                        const statusBadge = getStatusBadge(key, val);

                        return (
                          <div
                            key={key}
                            className="rounded-2xl border border-black/8 bg-slate-50/90 p-3.5 space-y-1.5"
                          >
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {label}
                            </span>
                            {statusBadge ? (
                              <div>
                                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${statusBadge.className}`}>
                                  {statusBadge.label}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs font-bold text-foreground break-words">{display}</p>
                            )}
                            {rawId && (
                              <div className="mt-1 flex items-center justify-between gap-1 border-t border-black/5 pt-1">
                                <span className="font-mono text-[10px] text-muted-foreground/80 truncate">
                                  ID: {rawId}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(rawId, `field-${key}`)}
                                  className="p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Copy ID"
                                >
                                  {copiedId === `field-${key}` ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <pre className="max-h-60 overflow-y-auto rounded-2xl border border-black/10 bg-slate-900 p-4 font-mono text-xs text-emerald-400 whitespace-pre-wrap break-all">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(inspectItem.detail), null, 2);
                        } catch {
                          return inspectItem.detail;
                        }
                      })()}
                    </pre>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-black/15 bg-slate-50/80 p-5 text-center text-xs text-muted-foreground">
                    No additional detail payload attached to this record.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-black/10 pt-4">
                <button
                  type="button"
                  onClick={() => setInspectItem(null)}
                  className="apple-button rounded-xl bg-slate-100 px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
