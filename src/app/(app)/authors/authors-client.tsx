"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SmoothDropdown } from "@/components/dropdown";
import { formatPaise } from "@/lib/money";
import { formatIST } from "@/lib/time";

export type AuthorDetailItem = {
  id: string;
  name: string;
  name_ml: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  pan: string | null;
  notes: string | null;
  created_at: string;
  titles: {
    id: string;
    name: string;
    name_ml: string | null;
    isbn: string | null;
    category: string | null;
    language: string;
    edition: string;
    edition_no: number;
    mrp_paise: number;
    stock: number;
    status: string;
    created_at: string;
  }[];
  contracts: {
    id: string;
    title_id: string;
    royalty_pct: number;
    basis: string;
    advance_paise: number;
    signed_on: string | null;
    term_notes: string | null;
    created_at: string;
    titles: {
      id: string;
      name: string;
      name_ml: string | null;
    };
  }[];
  payouts: {
    id: string;
    gross_paise: number;
    tds_paise: number;
    net_paise: number;
    paid_on: string;
    method: string | null;
    reference: string | null;
    note: string | null;
  }[];
  userAccount: {
    id: string;
    email: string;
    name: string;
    active: boolean;
    created_at: string;
  } | null;
  submissions: {
    id: string;
    ref_no: string;
    title: string;
    title_ml: string | null;
    genre: string;
    email: string;
    author_name: string;
    status: string;
    submitted_at: string;
    decided_on: string | null;
  }[];
  isSynthesized?: boolean;
};

type SortField = "name" | "books" | "submissions" | "recent";
type FilterTab = "all" | "contracted" | "portal_active" | "submissions" | "no_contract";

type ParsedNotes = {
  bio: string | null;
  avatar: string | null;
  interests: string | null;
  pastPublications: string | null;
  plainNotes: string | null;
};

function parseAuthorNotes(rawNotes: string | null): ParsedNotes {
  if (!rawNotes) return { bio: null, avatar: null, interests: null, pastPublications: null, plainNotes: null };
  try {
    const parsed = JSON.parse(rawNotes) as Record<string, unknown>;
    if (typeof parsed === "object" && parsed !== null) {
      return {
        bio: typeof parsed.bio === "string" && parsed.bio.trim() ? parsed.bio : null,
        avatar: typeof parsed.avatar === "string" && parsed.avatar.trim() ? parsed.avatar : null,
        interests: Array.isArray(parsed.interests)
          ? parsed.interests.filter((i): i is string => typeof i === "string").join(", ")
          : typeof parsed.interests === "string" && parsed.interests.trim()
          ? parsed.interests
          : null,
        pastPublications:
          typeof parsed.past_publications === "string" && parsed.past_publications.trim()
            ? parsed.past_publications
            : null,
        plainNotes: null,
      };
    }
  } catch {
    // raw notes is text
  }
  return { bio: null, avatar: null, interests: null, pastPublications: null, plainNotes: rawNotes };
}

export default function AuthorsClient({ initialAuthors }: { initialAuthors: AuthorDetailItem[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [authors] = useState<AuthorDetailItem[]>(initialAuthors);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortField, setSortField] = useState<SortField>("name");

  // Selected author for detailed slide-over drawer
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorDetailItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "books" | "contracts" | "submissions">("overview");

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<AuthorDetailItem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formNameMl, setFormNameMl] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPan, setFormPan] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Stats
  const stats = useMemo(() => {
    const total = authors.length;
    const contracted = authors.filter((a) => a.contracts.length > 0).length;
    const portalUsers = authors.filter((a) => a.userAccount && a.userAccount.active).length;
    const totalTitles = authors.reduce((acc, a) => acc + a.titles.length, 0);
    return { total, contracted, portalUsers, totalTitles };
  }, [authors]);

  // Filtered & Sorted authors
  const filteredAuthors = useMemo(() => {
    return authors
      .filter((author) => {
        // Search filter
        const q = search.toLowerCase().trim();
        const matchesSearch =
          !q ||
          author.name.toLowerCase().includes(q) ||
          (author.name_ml && author.name_ml.toLowerCase().includes(q)) ||
          (author.email && author.email.toLowerCase().includes(q)) ||
          (author.phone && author.phone.includes(q)) ||
          (author.address && author.address.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        // Tab filter
        if (activeTab === "contracted") return author.contracts.length > 0;
        if (activeTab === "portal_active") return Boolean(author.userAccount && author.userAccount.active);
        if (activeTab === "submissions") return author.submissions.length > 0;
        if (activeTab === "no_contract") return author.contracts.length === 0;

        return true;
      })
      .sort((a, b) => {
        if (sortField === "name") return a.name.localeCompare(b.name);
        if (sortField === "books") return b.titles.length - a.titles.length;
        if (sortField === "submissions") return b.submissions.length - a.submissions.length;
        if (sortField === "recent") return b.created_at.localeCompare(a.created_at);
        return 0;
      });
  }, [authors, search, activeTab, sortField]);

  // Keep selected author updated if authors list changes
  const currentSelectedAuthor = useMemo(() => {
    if (!selectedAuthor) return null;
    return authors.find((a) => a.id === selectedAuthor.id) || selectedAuthor;
  }, [authors, selectedAuthor]);

  async function handleCreateAuthor(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          name_ml: formNameMl || null,
          email: formEmail || null,
          phone: formPhone || null,
          address: formAddress || null,
          pan: formPan || null,
          notes: formNotes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to create author profile");
      } else {
        setSuccess(`Author "${formName}" created successfully!`);
        setIsAddOpen(false);
        setFormName("");
        setFormNameMl("");
        setFormEmail("");
        setFormPhone("");
        setFormAddress("");
        setFormPan("");
        setFormNotes("");
        router.refresh();
      }
    } catch {
      setError("Network error while creating author");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateAuthor(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAuthor) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/authors/${editingAuthor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          name_ml: formNameMl || null,
          email: formEmail || null,
          phone: formPhone || null,
          address: formAddress || null,
          pan: formPan || null,
          notes: formNotes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to update author");
      } else {
        setSuccess(`Author "${formName}" updated successfully!`);
        setEditingAuthor(null);
        router.refresh();
      }
    } catch {
      setError("Network error while updating author");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner Notifications */}
      {success && (
        <div className="flex items-center justify-between rounded-2xl border border-success/30 bg-success/10 p-4 text-sm font-bold text-success animate-in fade-in duration-150">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-xs opacity-75 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm font-bold text-danger animate-in fade-in duration-150">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs opacity-75 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Authors &amp; Contributors</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Manage author profiles, literary bibliographies, royal contract terms, and web portal access.
          </p>
        </div>

        <button
          onClick={() => {
            setFormName("");
            setFormNameMl("");
            setFormEmail("");
            setFormPhone("");
            setFormAddress("");
            setFormPan("");
            setFormNotes("");
            setError(null);
            setIsAddOpen(true);
          }}
          className="apple-button inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Author</span>
        </button>
      </div>

      {/* Bento KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-sm border border-black/[0.08] bg-surface/90 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Total Authors</span>
          </div>
          <p className="mt-2 text-3xl font-black text-foreground">{stats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">Registered in publisher roster</p>
        </div>

        <div className="rounded-sm border border-black/[0.08] bg-surface/90 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Contracted</span>
          </div>
          <p className="mt-2 text-3xl font-black text-primary">{stats.contracted}</p>
          <p className="mt-1 text-xs text-muted-foreground">With signed book agreements</p>
        </div>

        <div className="rounded-sm border border-black/[0.08] bg-surface/90 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span>Portal Accounts</span>
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.portalUsers}</p>
          <p className="mt-1 text-xs text-muted-foreground">Active online portal logins</p>
        </div>

        <div className="rounded-sm border border-black/[0.08] bg-surface/90 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Published Titles</span>
          </div>
          <p className="mt-2 text-3xl font-black text-foreground">{stats.totalTitles}</p>
          <p className="mt-1 text-xs text-muted-foreground">Catalog books linked to authors</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by author name, Malayalam, email, phone, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills and Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: "all", label: "All Authors", count: stats.total },
              { key: "contracted", label: "Contracted", count: stats.contracted },
              { key: "portal_active", label: "Portal Active", count: stats.portalUsers },
              {
                key: "submissions",
                label: "With Submissions",
                count: authors.filter((a) => a.submissions.length > 0).length,
              },
              {
                key: "no_contract",
                label: "No Contract",
                count: authors.filter((a) => a.contracts.length === 0).length,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as FilterTab)}
                className={`apple-button rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-foreground text-background shadow-xs font-extrabold"
                    : "border border-black/8 bg-surface text-muted-foreground hover:bg-black/5 hover:text-foreground dark:border-white/10 dark:bg-surface-muted/50"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-[10px] ${activeTab === tab.key ? "opacity-80" : "opacity-60"}`}>
                  ({tab.count})
                </span>
              </button>
            ))}
          </div>

          <div className="w-44">
            <SmoothDropdown
              size="sm"
              value={sortField}
              onChange={(val) => setSortField(val as SortField)}
              ariaLabel="Sort authors"
              options={[
                { value: "name", label: "Name (A → Z)" },
                { value: "books", label: "Most Books" },
                { value: "submissions", label: "Most Submissions" },
                { value: "recent", label: "Recently Added" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Authors Bento Table */}
      <section className="overflow-hidden rounded-sm border border-black/[0.08] bg-surface/90 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-black/[0.02] text-xs font-bold uppercase tracking-wider text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.02]">
              <tr>
                <th className="px-6 py-4.5 whitespace-nowrap">Author</th>
                <th className="px-6 py-4.5 whitespace-nowrap">Contact Details</th>
                <th className="px-6 py-4.5 whitespace-nowrap">Catalog Titles</th>
                <th className="px-6 py-4.5 whitespace-nowrap">Contract Agreement</th>
                <th className="px-6 py-4.5 whitespace-nowrap">Portal Status</th>
                <th className="px-6 py-4.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {filteredAuthors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5 text-2xl dark:bg-white/5">
                      ✍️
                    </div>
                    <p className="mt-3 text-base font-bold text-foreground">No authors match your criteria</p>
                    <p className="mt-1 text-xs">Try adjusting your search terms or filter tabs.</p>
                  </td>
                </tr>
              ) : (
                filteredAuthors.map((author) => {
                  const initials = author.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const activeContract = author.contracts[0];
                  const hasPortal = author.userAccount && author.userAccount.active;

                  return (
                    <tr
                      key={author.id}
                      onClick={() => {
                        setSelectedAuthor(author);
                        setDrawerTab("overview");
                      }}
                      className="group cursor-pointer transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]"
                    >
                      {/* Author Name + Avatar */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-extrabold text-primary shadow-xs group-hover:scale-105 transition-transform">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                                {author.name}
                              </span>
                            </div>
                            {author.name_ml && (
                              <span className="block text-[11px] font-medium text-muted-foreground">
                                {author.name_ml}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground/70">
                              Joined {author.created_at.slice(0, 10)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="px-6 py-4.5">
                        <div className="space-y-1">
                          {author.email ? (
                            <div className="flex items-center gap-1.5 text-xs text-foreground">
                              <svg className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>{author.email}</span>
                            </div>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">No email provided</span>
                          )}
                          {author.phone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <svg className="h-3 w-3 shrink-0 text-muted-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{author.phone}</span>
                            </div>
                          )}
                          {author.address && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <svg className="h-3 w-3 shrink-0 text-muted-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="truncate max-w-[180px]">{author.address}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Published Titles Count */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-black/8 bg-black/[0.03] px-2.5 py-1 text-xs font-extrabold text-foreground dark:border-white/10 dark:bg-white/[0.04]">
                            <svg className="h-3.5 w-3.5 shrink-0 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span>{author.titles.length}</span>
                            <span className="text-[10px] font-normal text-muted-foreground">
                              {author.titles.length === 1 ? "book" : "books"}
                            </span>
                          </span>
                        </div>
                        {author.titles.length > 0 && (
                          <p className="mt-1 text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {author.titles[0].name}
                            {author.titles.length > 1 && ` +${author.titles.length - 1} more`}
                          </p>
                        )}
                      </td>

                      {/* Contract Agreement */}
                      <td className="px-6 py-4.5">
                        {activeContract ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              {activeContract.royalty_pct}% Royalty ({activeContract.basis.toUpperCase()})
                            </span>
                            {activeContract.advance_paise > 0 && (
                              <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                Adv: {formatPaise(activeContract.advance_paise)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5">
                            No Active Contract
                          </span>
                        )}
                      </td>

                      {/* Portal Status */}
                      <td className="px-6 py-4.5">
                        {hasPortal ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            Portal Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-muted-foreground dark:bg-white/5">
                            Profile Only
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4.5 text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setSelectedAuthor(author);
                              setDrawerTab("overview");
                            }}
                            className="apple-button rounded-xl border border-black/10 bg-surface px-3 py-1.5 text-xs font-bold text-foreground hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60 cursor-pointer"
                          >
                            Details
                          </button>

                          <button
                            onClick={() => {
                              setFormName(author.name);
                              setFormNameMl(author.name_ml || "");
                              setFormEmail(author.email || "");
                              setFormPhone(author.phone || "");
                              setFormAddress(author.address || "");
                              setFormPan(author.pan || "");
                              const { plainNotes, bio } = parseAuthorNotes(author.notes);
                              setFormNotes(plainNotes || bio || author.notes || "");
                              setError(null);
                              setEditingAuthor(author);
                            }}
                            className="apple-button rounded-xl border border-black/10 bg-surface px-3 py-1.5 text-xs font-bold text-foreground hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* AUTHOR DETAILS SLIDE-OVER DRAWER */}
      {currentSelectedAuthor && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setSelectedAuthor(null)}
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="relative w-screen max-w-xl border-l border-border bg-surface p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-white shadow-md">
                    {currentSelectedAuthor.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black tracking-tight text-foreground">
                        {currentSelectedAuthor.name}
                      </h2>
                      {currentSelectedAuthor.userAccount?.active ? (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                          Portal Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-white/10">
                          Profile
                        </span>
                      )}
                    </div>
                    {currentSelectedAuthor.name_ml && (
                      <p className="text-xs font-semibold text-primary">{currentSelectedAuthor.name_ml}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Author Record ID: {currentSelectedAuthor.id} · Member since{" "}
                      {currentSelectedAuthor.created_at.slice(0, 10)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAuthor(null)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Segmented Tab Navigation */}
              <div className="mt-4 flex gap-1 rounded-2xl border border-black/10 bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/[0.03]">
                {[
                  { key: "overview", label: "Overview & Bio" },
                  { key: "books", label: `Books (${currentSelectedAuthor.titles.length})` },
                  { key: "contracts", label: `Contracts (${currentSelectedAuthor.contracts.length})` },
                  { key: "submissions", label: `Submissions (${currentSelectedAuthor.submissions.length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDrawerTab(tab.key as typeof drawerTab)}
                    className={`apple-button flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      drawerTab === tab.key
                        ? "bg-surface text-foreground shadow-xs font-extrabold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: Overview & Bio */}
              {drawerTab === "overview" && (
                <div className="mt-6 space-y-6 animate-in fade-in duration-150">
                  {/* Bio / Notes Box */}
                  {(() => {
                    const notesInfo = parseAuthorNotes(currentSelectedAuthor.notes);
                    return (
                      <div className="rounded-2xl border border-border bg-background/50 p-4 space-y-3">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                          Author Profile &amp; Biography
                        </h3>
                        {notesInfo.bio ? (
                          <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                            {notesInfo.bio}
                          </p>
                        ) : notesInfo.plainNotes ? (
                          <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                            {notesInfo.plainNotes}
                          </p>
                        ) : (
                          <p className="text-xs italic text-muted-foreground">
                            No biography or personal statement added yet.
                          </p>
                        )}

                        {notesInfo.interests && (
                          <div className="pt-2 border-t border-border/50">
                            <span className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                              Literary Genres &amp; Interests
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {notesInfo.interests.split(",").map((i: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                                >
                                  {i.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {notesInfo.pastPublications && (
                          <div className="pt-2 border-t border-border/50">
                            <span className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                              Past Works &amp; Publications
                            </span>
                            <p className="text-xs text-foreground/80">{notesInfo.pastPublications}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Contact and Legal Details */}
                  <div className="rounded-2xl border border-border bg-background/50 p-4 space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                      Contact &amp; Legal Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block text-[10px] text-muted-foreground">Email Address</span>
                        <span className="font-semibold text-foreground break-all">
                          {currentSelectedAuthor.email || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground">Phone Number</span>
                        <span className="font-semibold text-foreground">
                          {currentSelectedAuthor.phone || "—"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[10px] text-muted-foreground">Postal Address / Location</span>
                        <span className="font-semibold text-foreground">
                          {currentSelectedAuthor.address || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground">PAN / Tax Identifier</span>
                        <span className="font-mono font-bold text-foreground">
                          {currentSelectedAuthor.pan || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground">System Record Created</span>
                        <span className="font-medium text-foreground">
                          {currentSelectedAuthor.created_at}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Portal User Credentials Status */}
                  <div className="rounded-2xl border border-border bg-background/50 p-4 space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                      Web Portal Account
                    </h3>
                    {currentSelectedAuthor.userAccount ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Account Status:</span>
                          <span className="font-bold text-success">Active Registered User</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Login Email:</span>
                          <span className="font-medium text-foreground">{currentSelectedAuthor.userAccount.email}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Registered On:</span>
                          <span className="font-medium text-foreground">
                            {currentSelectedAuthor.userAccount.created_at.slice(0, 10)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground space-y-2">
                        <p>
                          This author does not have a web portal login account yet. When an author signs up or sets up
                          their account with their email ({currentSelectedAuthor.email || "unregistered"}), their account
                          will be automatically synchronized here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Published Books */}
              {drawerTab === "books" && (
                <div className="mt-6 space-y-3 animate-in fade-in duration-150">
                  {currentSelectedAuthor.titles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                      <p className="font-bold text-foreground">No published titles cataloged</p>
                      <p className="mt-1">When contracts are accepted and titles are added, they will appear here.</p>
                    </div>
                  ) : (
                    currentSelectedAuthor.titles.map((title) => (
                      <div
                        key={title.id}
                        className="rounded-2xl border border-border bg-background/50 p-4 transition-all hover:border-primary/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary">
                              <svg className="h-5 w-5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-foreground">{title.name}</h4>
                              {title.name_ml && (
                                <p className="text-xs text-muted-foreground">{title.name_ml}</p>
                              )}
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                ISBN: {title.isbn || "Pending"} · {title.language} · {title.edition} Ed.
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-extrabold text-primary">
                            {formatPaise(title.mrp_paise)}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block">Warehouse Stock</span>
                            <span className="font-bold text-foreground">{title.stock} copies</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Category</span>
                            <span className="font-bold text-foreground capitalize">{title.category || "General"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Catalog Status</span>
                            <span className="font-bold text-foreground capitalize">{title.status}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-end">
                          <Link
                            href="/titles"
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            View in Books Catalog &rarr;
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: Contracts & Royalties */}
              {drawerTab === "contracts" && (
                <div className="mt-6 space-y-4 animate-in fade-in duration-150">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Active Contracts ({currentSelectedAuthor.contracts.length})
                  </h3>

                  {currentSelectedAuthor.contracts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                      <p className="font-bold text-foreground">No contracts on record</p>
                      <p className="mt-1">Contracts are issued upon manuscript acceptance.</p>
                    </div>
                  ) : (
                    currentSelectedAuthor.contracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="rounded-2xl border border-border bg-background/50 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-foreground">
                              {contract.titles?.name || "Book Agreement"}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              Contract ID: {contract.id}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                            {contract.royalty_pct}% Royalty
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2.5">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Calculation Basis</span>
                            <span className="font-semibold text-foreground uppercase">{contract.basis}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Advance Amount</span>
                            <span className="font-bold text-foreground">
                              {formatPaise(contract.advance_paise)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Signed Date</span>
                            <span className="font-semibold text-foreground">
                              {contract.signed_on ? contract.signed_on.slice(0, 10) : "Pending Signature"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Created At</span>
                            <span className="font-semibold text-foreground">{contract.created_at.slice(0, 10)}</span>
                          </div>
                        </div>

                        {contract.term_notes && (
                          <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">Terms: </span>
                            {contract.term_notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Payouts section */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
                      Royalty Payouts Ledger ({currentSelectedAuthor.payouts.length})
                    </h3>
                    {currentSelectedAuthor.payouts.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">No royalty payouts settled yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {currentSelectedAuthor.payouts.map((payout) => (
                          <div
                            key={payout.id}
                            className="rounded-xl border border-border bg-background/40 p-3 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-foreground">
                                {formatPaise(payout.net_paise)} Net Paid
                              </span>
                              <p className="text-[11px] text-muted-foreground">
                                {payout.paid_on} · {payout.method || "Bank Transfer"} {payout.reference ? `(${payout.reference})` : ""}
                              </p>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              Gross: {formatPaise(payout.gross_paise)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Submissions History */}
              {drawerTab === "submissions" && (
                <div className="mt-6 space-y-3 animate-in fade-in duration-150">
                  {currentSelectedAuthor.submissions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                      <p className="font-bold text-foreground">No submissions found</p>
                      <p className="mt-1">
                        Manuscripts submitted with email {currentSelectedAuthor.email || "on record"} will display here.
                      </p>
                    </div>
                  ) : (
                    currentSelectedAuthor.submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-2xl border border-border bg-background/50 p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-primary">
                              {sub.ref_no}
                            </span>
                            <h4 className="text-sm font-bold text-foreground">{sub.title}</h4>
                            {sub.title_ml && (
                              <p className="text-xs text-muted-foreground">{sub.title_ml}</p>
                            )}
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                              sub.status === "accepted"
                                ? "bg-success/10 text-success"
                                : sub.status === "declined"
                                ? "bg-danger/10 text-danger"
                                : sub.status === "needs_revision"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {sub.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                          <span>Genre: {sub.genre}</span>
                          <span>Submitted: {sub.submitted_at.slice(0, 10)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Drawer Footer Actions */}
              <div className="mt-8 pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedAuthor(null)}
                  className="apple-button rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setFormName(currentSelectedAuthor.name);
                    setFormNameMl(currentSelectedAuthor.name_ml || "");
                    setFormEmail(currentSelectedAuthor.email || "");
                    setFormPhone(currentSelectedAuthor.phone || "");
                    setFormAddress(currentSelectedAuthor.address || "");
                    setFormPan(currentSelectedAuthor.pan || "");
                    const { plainNotes, bio } = parseAuthorNotes(currentSelectedAuthor.notes);
                    setFormNotes(plainNotes || bio || currentSelectedAuthor.notes || "");
                    setError(null);
                    setEditingAuthor(currentSelectedAuthor);
                  }}
                  className="apple-button rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary-hover cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Author */}
      {isAddOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/40">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-black/10 bg-surface shadow-2xl dark:border-white/15 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">Add New Author</h3>
                <p className="text-xs text-muted-foreground">Create author profile in the publisher registry.</p>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAuthor} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    Full Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Kumar"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    Malayalam Name (മലയാളം)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ആനന്ദ് കുമാർ"
                    value={formNameMl}
                    onChange={(e) => setFormNameMl(e.target.value)}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="author@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    Location / Place
                  </label>
                  <input
                    type="text"
                    placeholder="Kottayam, Kerala"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    PAN Card / Tax ID
                  </label>
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    value={formPan}
                    onChange={(e) => setFormPan(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none uppercase transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Biography &amp; Editorial Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Author background, past awards, genres, and literary notes..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs font-bold text-danger">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="apple-button flex-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-xs font-bold text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.04] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="apple-button flex-1 rounded-xl bg-foreground py-2.5 text-xs font-bold text-background shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Creating..." : "Save Author"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Edit Author */}
      {editingAuthor && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/40">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-black/10 bg-surface shadow-2xl dark:border-white/15 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">Edit Author Profile</h3>
                <p className="text-xs text-muted-foreground">Update details for {editingAuthor.name}.</p>
              </div>
              <button
                onClick={() => setEditingAuthor(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/20 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAuthor} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    Full Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    Malayalam Name (മലയാളം)
                  </label>
                  <input
                    type="text"
                    value={formNameMl}
                    onChange={(e) => setFormNameMl(e.target.value)}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    Location / Place
                  </label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                    PAN Card / Tax ID
                  </label>
                  <input
                    type="text"
                    value={formPan}
                    onChange={(e) => setFormPan(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none uppercase transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Biography &amp; Editorial Notes
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-xl border border-black/12 bg-black/[0.02] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-surface dark:border-white/15 dark:bg-white/[0.03]"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs font-bold text-danger">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAuthor(null)}
                  className="apple-button flex-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-xs font-bold text-foreground hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.04] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="apple-button flex-1 rounded-xl bg-foreground py-2.5 text-xs font-bold text-background shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Saving..." : "Save Changes"}
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
