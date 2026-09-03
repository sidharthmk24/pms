"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatPaise } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { SmoothDropdown, type DropdownOption } from "@/components/dropdown";

export type TitleItem = {
  id: string;
  isbn: string | null;
  name: string;
  name_ml: string | null;
  category: string | null;
  language: string;
  edition: string;
  edition_no: number;
  mrp_paise: number;
  unit_cost_paise: number;
  pages: number | null;
  binding: string | null;
  reorder_level: number;
  stock: number;
  status: string;
  created_at: string;
  authors: {
    id: string;
    name: string;
    name_ml: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  contracts: {
    id: string;
    basis: string;
    royalty_pct: number;
    advance_paise: number;
    signed_on: string | null;
  } | null;
  production_projects: {
    id: string;
    status: string;
    print_completed_at: string | null;
    final_cover_path: string | null;
    final_layout_path: string | null;
  } | null;
  latest_print_job?: {
    id: string;
    job_no: string;
    qty: number;
    status: string;
  } | null;
  recent_movements?: {
    id: string;
    qty_delta: number;
    reason: string;
    balance_after: number;
    at: string;
    note: string | null;
  }[];
};

type SortField = "name" | "author" | "mrp" | "stock" | "isbn" | "created_at";
type SortOrder = "asc" | "desc";

export function TitlesClient({
  initialTitles,
  categories,
}: {
  initialTitles: TitleItem[];
  categories: string[];
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock" | "out_of_print">("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Selected book for details slide-over
  const [selectedBook, setSelectedBook] = useState<TitleItem | null>(null);

  // Preview modal state
  const [previewProject, setPreviewProject] = useState<{
    id: string;
    title: string;
    hasLayout: boolean;
    hasCover: boolean;
  } | null>(null);

  const [copiedIsbn, setCopiedIsbn] = useState<string | null>(null);

  function copyToClipboard(text: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIsbn(text);
      setTimeout(() => setCopiedIsbn(null), 2000);
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  // Filter and sort logic
  const filteredTitles = useMemo(() => {
    return initialTitles
      .filter((item) => {
        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesName = item.name.toLowerCase().includes(q);
          const matchesNameMl = item.name_ml?.toLowerCase().includes(q);
          const matchesAuthor = item.authors?.name.toLowerCase().includes(q);
          const matchesAuthorMl = item.authors?.name_ml?.toLowerCase().includes(q);
          const matchesIsbn = item.isbn?.toLowerCase().includes(q);
          const matchesCategory = item.category?.toLowerCase().includes(q);
          if (!matchesName && !matchesNameMl && !matchesAuthor && !matchesAuthorMl && !matchesIsbn && !matchesCategory) {
            return false;
          }
        }

        // Category
        if (selectedCategory !== "all") {
          if ((item.category || "").toLowerCase() !== selectedCategory.toLowerCase()) {
            return false;
          }
        }

        // Stock availability
        if (stockFilter === "in_stock" && item.stock <= 0) return false;
        if (stockFilter === "low_stock" && (item.stock <= 0 || item.stock > item.reorder_level)) return false;
        if (stockFilter === "out_of_stock" && item.stock > 0) return false;
        if (stockFilter === "out_of_print" && item.status !== "out_of_print") return false;

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "name") {
          cmp = a.name.localeCompare(b.name);
        } else if (sortField === "author") {
          const authorA = a.authors?.name || "";
          const authorB = b.authors?.name || "";
          cmp = authorA.localeCompare(authorB);
        } else if (sortField === "mrp") {
          cmp = a.mrp_paise - b.mrp_paise;
        } else if (sortField === "stock") {
          cmp = a.stock - b.stock;
        } else if (sortField === "isbn") {
          cmp = (a.isbn || "").localeCompare(b.isbn || "");
        } else if (sortField === "created_at") {
          cmp = a.created_at.localeCompare(b.created_at);
        }

        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [initialTitles, search, selectedCategory, stockFilter, sortField, sortOrder]);

  // Overall catalog metrics
  const totalStock = useMemo(() => initialTitles.reduce((acc, t) => acc + (t.stock || 0), 0), [initialTitles]);
  const totalValuation = useMemo(() => initialTitles.reduce((acc, t) => acc + (t.stock * t.mrp_paise || 0), 0), [initialTitles]);
  const lowStockCount = useMemo(() => initialTitles.filter((t) => t.stock > 0 && t.stock <= t.reorder_level).length, [initialTitles]);

  const categoryOptions: DropdownOption[] = useMemo(() => [
    { value: "all", label: `All Genres (${categories.length})` },
    ...categories.map((c) => ({
      value: c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
    })),
  ], [categories]);

  const stockOptions: DropdownOption[] = useMemo(() => [
    { value: "all", label: "All Inventory Status" },
    { value: "in_stock", label: "🟢 In Stock (> 0)" },
    { value: "low_stock", label: "🟡 Low Stock (≤ reorder)" },
    { value: "out_of_stock", label: "🔴 Out of Stock (0)" },
    { value: "out_of_print", label: "⚪ Out of Print" },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header & Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/[0.08] bg-surface p-4 shadow-xs dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catalog Titles</span>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">📚</span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{initialTitles.length}</p>
          <span className="text-[11px] text-muted-foreground">Published &amp; registered books</span>
        </div>

        <div className="rounded-2xl border border-black/[0.08] bg-surface p-4 shadow-xs dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Warehouse Stock</span>
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">📦</span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{totalStock.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">copies</span></p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Available inventory</span>
        </div>

        <div className="rounded-2xl border border-black/[0.08] bg-surface p-4 shadow-xs dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inventory Valuation</span>
            <span className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">💰</span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{formatPaise(totalValuation)}</p>
          <span className="text-[11px] text-muted-foreground">Total retail MRP value</span>
        </div>

        <div className="rounded-2xl border border-black/[0.08] bg-surface p-4 shadow-xs dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Low Stock Alerts</span>
            <span className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">⚠️</span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{lowStockCount}</p>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Titles below reorder limit</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.08] bg-surface p-4 shadow-xs dark:border-white/[0.08] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, Malayalam title, author, or ISBN..."
              className="w-full rounded-xl border border-black/10 bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Genre / Category Filter */}
          <div className="w-48">
            <SmoothDropdown
              options={categoryOptions}
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              size="sm"
              placeholder="All Genres"
            />
          </div>

          {/* Stock Availability Filter */}
          <div className="w-56">
            <SmoothDropdown
              options={stockOptions}
              value={stockFilter}
              onChange={(val) => setStockFilter(val as any)}
              size="sm"
              placeholder="All Inventory Status"
            />
          </div>

          {(search || selectedCategory !== "all" || stockFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategory("all");
                setStockFilter("all");
              }}
              className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Showing <strong className="text-foreground">{filteredTitles.length}</strong> of {initialTitles.length} titles</span>
        </div>
      </div>

      {/* Main Titles Table */}
      <div className="rounded-2xl border border-black/[0.08] bg-surface shadow-xs dark:border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black/[0.08] bg-black/[0.02] text-muted-foreground font-semibold dark:border-white/[0.08] dark:bg-white/[0.02]">
                <th
                  onClick={() => toggleSort("name")}
                  className="py-3.5 px-4 cursor-pointer hover:text-foreground transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Book Title</span>
                    {sortField === "name" && (
                      <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("author")}
                  className="py-3.5 px-4 cursor-pointer hover:text-foreground transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Author</span>
                    {sortField === "author" && (
                      <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("isbn")}
                  className="py-3.5 px-4 cursor-pointer hover:text-foreground transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ISBN</span>
                    {sortField === "isbn" && (
                      <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4">Genre / Edition</th>
                <th
                  onClick={() => toggleSort("mrp")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-foreground transition select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>MRP</span>
                    {sortField === "mrp" && (
                      <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("stock")}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-foreground transition select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Warehouse Stock</span>
                    {sortField === "stock" && (
                      <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {filteredTitles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <p className="text-base font-semibold text-foreground mb-1">No titles match your filter</p>
                    <p className="text-xs">Try adjusting your search terms or genre filter.</p>
                  </td>
                </tr>
              ) : (
                filteredTitles.map((title) => {
                  const isLow = title.stock > 0 && title.stock <= title.reorder_level;
                  const isOut = title.stock === 0 && title.status !== "out_of_print";
                  const isOutOfPrint = title.status === "out_of_print";

                  return (
                    <tr
                      key={title.id}
                      onClick={() => setSelectedBook(title)}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition cursor-pointer group"
                    >
                      {/* Title & Language */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20 text-xs font-bold text-primary shadow-2xs group-hover:scale-105 transition-transform">
                            📖
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-foreground block truncate max-w-xs sm:max-w-sm group-hover:text-primary transition-colors">
                              {title.name}
                            </span>
                            {title.name_ml && (
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {title.name_ml}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                        {title.authors ? (
                          <div>
                            <span>{title.authors.name}</span>
                            {title.authors.name_ml && (
                              <span className="block text-[10px] text-muted-foreground">
                                {title.authors.name_ml}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">No author linked</span>
                        )}
                      </td>

                      {/* ISBN */}
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                        {title.isbn ? (
                          <button
                            type="button"
                            onClick={(e) => copyToClipboard(title.isbn!, e)}
                            title="Click to copy ISBN"
                            className="inline-flex items-center gap-1 rounded-md bg-black/5 dark:bg-white/5 px-2 py-0.5 font-bold hover:bg-primary/15 hover:text-primary transition cursor-pointer"
                          >
                            <span>{title.isbn}</span>
                            <span className="text-[9px] opacity-60">
                              {copiedIsbn === title.isbn ? "✓" : "📋"}
                            </span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground italic">Pending</span>
                        )}
                      </td>

                      {/* Category & Edition */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-primary/5 border border-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary capitalize mr-1.5">
                          {title.category || "General"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {title.edition || "1st"} Ed.
                        </span>
                      </td>

                      {/* MRP */}
                      <td className="py-3 px-4 text-right font-bold text-foreground whitespace-nowrap">
                        {title.mrp_paise > 0 ? (
                          formatPaise(title.mrp_paise)
                        ) : (
                          <span className="text-muted-foreground font-normal italic">Unset</span>
                        )}
                      </td>

                      {/* Stock & Status Pill */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-extrabold text-foreground">
                            {title.stock.toLocaleString()}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              isOutOfPrint
                                ? "bg-neutral-500/10 text-neutral-500 border-neutral-500/20"
                                : isOut
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                : isLow
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {isOutOfPrint
                              ? "Out of Print"
                              : isOut
                              ? "Out of Stock"
                              : isLow
                              ? `Low (${title.stock})`
                              : "In Stock"}
                          </span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Deliverable preview if project linked */}
                          {title.production_projects?.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewProject({
                                  id: title.production_projects!.id,
                                  title: title.name,
                                  hasLayout: Boolean(title.production_projects!.final_layout_path),
                                  hasCover: Boolean(title.production_projects!.final_cover_path),
                                });
                              }}
                              title="Preview typeset layout and cover"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted transition cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          )}

                          {/* Link to production pipeline if active */}
                          {title.production_projects?.id ? (
                            <Link
                              href={`/production/${title.production_projects.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition shadow-2xs"
                            >
                              <span>Pipeline</span>
                              <span>&rarr;</span>
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedBook(title)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold hover:bg-surface-muted transition cursor-pointer"
                            >
                              Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-Over Book Details Drawer */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedBook(null)}
          />

          {/* Drawer Container */}
          <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4 mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-primary tracking-wider">
                  Book Specifications · {selectedBook.language}
                </span>
                <h3 className="text-lg font-black text-foreground font-serif leading-snug">
                  {selectedBook.name}
                </h3>
                {selectedBook.name_ml && (
                  <p className="text-xs text-muted-foreground">{selectedBook.name_ml}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Book Metadata Grid */}
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-border bg-background/50 p-3.5 space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Bibliographic Data</h4>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <span className="block text-[10px]">Author</span>
                    <span className="font-semibold text-foreground">{selectedBook.authors?.name || "Unassigned"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">ISBN-13</span>
                    <span className="font-mono font-bold text-foreground">{selectedBook.isbn || "Pending"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Category / Genre</span>
                    <span className="font-semibold text-foreground capitalize">{selectedBook.category || "General"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Edition</span>
                    <span className="font-semibold text-foreground">{selectedBook.edition} (No. {selectedBook.edition_no})</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Binding</span>
                    <span className="font-semibold text-foreground">{selectedBook.binding || "Paperback"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Page Count</span>
                    <span className="font-semibold text-foreground">{selectedBook.pages ? `${selectedBook.pages} pages` : "Unset"}</span>
                  </div>
                </div>
              </div>

              {/* Commercial & Financial Specs */}
              <div className="rounded-xl border border-border bg-background/50 p-3.5 space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Pricing &amp; Royalties</h4>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <span className="block text-[10px]">Retail MRP</span>
                    <span className="font-black text-foreground text-sm">{formatPaise(selectedBook.mrp_paise)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Unit Print Cost</span>
                    <span className="font-semibold text-foreground">{formatPaise(selectedBook.unit_cost_paise)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Royalty Agreement</span>
                    <span className="font-semibold text-foreground">
                      {selectedBook.contracts ? `${selectedBook.contracts.royalty_pct}% (${selectedBook.contracts.basis})` : "No Contract"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Contract Advance</span>
                    <span className="font-semibold text-foreground">
                      {selectedBook.contracts ? formatPaise(selectedBook.contracts.advance_paise) : "₹0.00"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Balance & Inventory */}
              <div className="rounded-xl border border-border bg-background/50 p-3.5 space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Warehouse Inventory</h4>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Available Quantity</span>
                  <span className="text-lg font-black text-foreground">{selectedBook.stock.toLocaleString()} copies</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Reorder Threshold</span>
                  <span>{selectedBook.reorder_level} copies</span>
                </div>
              </div>

              {/* Recent Stock Movements */}
              {selectedBook.recent_movements && selectedBook.recent_movements.length > 0 && (
                <div className="rounded-xl border border-border bg-background/50 p-3.5 space-y-2">
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Recent Ledger Movements</h4>
                  <div className="space-y-1.5 divide-y divide-border/40">
                    {selectedBook.recent_movements.map((m) => (
                      <div key={m.id} className="pt-1.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-foreground capitalize block">{m.reason.replace(/_/g, " ")}</span>
                          <span className="text-[10px] text-muted-foreground">{formatIST(m.at, false)}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold ${m.qty_delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {m.qty_delta >= 0 ? `+${m.qty_delta}` : m.qty_delta}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">Bal: {m.balance_after}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Production Project Action */}
              {selectedBook.production_projects?.id && (
                <div className="pt-2">
                  <Link
                    href={`/production/${selectedBook.production_projects.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition cursor-pointer"
                  >
                    <span>Open Production Pipeline Project</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Protected Galley & Cover Preview Modal */}
      {previewProject && (
        <DocumentPreviewModal
          isOpen={true}
          onClose={() => setPreviewProject(null)}
          title={previewProject.title}
          projectId={previewProject.id}
          hasLayout={previewProject.hasLayout}
          hasCover={previewProject.hasCover}
        />
      )}
    </div>
  );
}
