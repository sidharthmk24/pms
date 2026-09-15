"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatPaise } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { SmoothDropdown, type DropdownOption } from "@/components/dropdown";

export type AuthorBookItem = {
  id: string;
  name: string;
  name_ml: string | null;
  isbn: string | null;
  category: string | null;
  language: string;
  edition: string;
  edition_no: number;
  mrp_paise: number;
  pages: number | null;
  binding: string | null;
  stock: number;
  status: string;
  created_at: string;
  contracts: {
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
    author_copies_qty: number | null;
    author_copies_dispatched_at: string | null;
    author_dispatch_tracking: string | null;
    channels_activated: string | null;
  } | null;
  print_jobs: {
    job_no: string;
    qty: number;
    status: string;
    received_on: string | null;
  }[];
};

type SortField = "name" | "mrp" | "stock" | "isbn" | "created_at";
type SortOrder = "asc" | "desc";

export function AuthorBooksClient({
  initialBooks,
  categories,
}: {
  initialBooks: AuthorBookItem[];
  categories: string[];
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Selected book for details slide-over
  const [selectedBook, setSelectedBook] = useState<AuthorBookItem | null>(null);

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

  const filteredBooks = useMemo(() => {
    return initialBooks
      .filter((book) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesName = book.name.toLowerCase().includes(q);
          const matchesNameMl = book.name_ml?.toLowerCase().includes(q);
          const matchesIsbn = book.isbn?.toLowerCase().includes(q);
          const matchesCategory = book.category?.toLowerCase().includes(q);
          if (!matchesName && !matchesNameMl && !matchesIsbn && !matchesCategory) {
            return false;
          }
        }

        if (selectedCategory !== "all") {
          if ((book.category || "").toLowerCase() !== selectedCategory.toLowerCase()) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "name") {
          cmp = a.name.localeCompare(b.name);
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
  }, [initialBooks, search, selectedCategory, sortField, sortOrder]);

  const totalCopiesPrinted = useMemo(() => {
    return initialBooks.reduce((acc, b) => {
      const printSum = b.print_jobs.reduce((pAcc, pj) => pAcc + pj.qty, 0);
      return acc + (printSum > 0 ? printSum : b.stock);
    }, 0);
  }, [initialBooks]);

  const totalAuthorCopies = useMemo(() => {
    return initialBooks.reduce((acc, b) => {
      return acc + (b.production_projects?.author_copies_qty || 0);
    }, 0);
  }, [initialBooks]);

  const categoryOptions: DropdownOption[] = useMemo(() => [
    { value: "all", label: `All Genres (${categories.length})` },
    ...categories.map((c) => ({
      value: c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
    })),
  ], [categories]);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/[0.08] bg-surface p-4 shadow-xs dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Published Titles</span>
            <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{initialBooks.length}</p>
          <span className="text-[11px] text-muted-foreground">In official publication</span>
        </div>

        <div className="rounded-2xl border border-black/[0.08] bg-surface p-4 shadow-xs dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Copies In Circulation</span>
            <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{totalCopiesPrinted.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">copies</span></p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Printed press run inventory</span>
        </div>

        <div className="rounded-2xl border border-black/[0.08] bg-surface p-4 shadow-xs dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Author Complimentary Copies</span>
            <span className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{totalAuthorCopies.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">copies</span></p>
          <span className="text-[11px] text-muted-foreground">Dispatched to your address</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      {(() => {
        const hasFilter = Boolean(search || selectedCategory !== "all");
        return (
          <div className={`relative z-20 flex flex-col gap-3 rounded-2xl border bg-white p-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between ${
            hasFilter ? "border-[#7e2562]/35 shadow-plum-md" : "border-[#7e2562]/15 shadow-plum-sm"
          }`}>
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1 max-w-sm">
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
                  placeholder="Search your published books or ISBN..."
                  className="w-full rounded-xl border border-black/10 bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#7e2562] focus:outline-none focus:ring-2 focus:ring-[#7e2562]/20 dark:border-white/10"
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

              <div className="w-48">
                <SmoothDropdown
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={(val) => setSelectedCategory(val)}
                  size="sm"
                  placeholder="All Genres"
                  buttonClassName={
                    selectedCategory && selectedCategory !== "all"
                      ? "!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
                      : ""
                  }
                />
              </div>

              {hasFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                  }}
                  className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5]/30 px-3 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/40 transition-all cursor-pointer"
                >
                  <span className="text-sm">✕</span>
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Showing <strong className="text-foreground">{filteredBooks.length}</strong> of {initialBooks.length} books
            </div>
          </div>
        );
      })()}

      {/* Published Books Table */}
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
                    {sortField === "name" && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("isbn")}
                  className="py-3.5 px-4 cursor-pointer hover:text-foreground transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ISBN</span>
                    {sortField === "isbn" && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </div>
                </th>
                <th className="py-3.5 px-4">Edition / Binding</th>
                <th
                  onClick={() => toggleSort("mrp")}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-foreground transition select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Retail MRP</span>
                    {sortField === "mrp" && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Royalty Rate</th>
                <th
                  onClick={() => toggleSort("stock")}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-foreground transition select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Warehouse Stock</span>
                    {sortField === "stock" && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Sales Channels</th>
                <th className="py-3.5 px-4 text-right">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <p className="text-base font-semibold text-foreground mb-1">No published books found</p>
                    <p className="text-xs">Your completed books will appear here once published &amp; printed.</p>
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => {
                  const proj = book.production_projects;
                  const activeChannels = (proj?.channels_activated || "retail,dealer,fair,online").split(",");

                  return (
                    <tr
                      key={book.id}
                      onClick={() => setSelectedBook(book)}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition cursor-pointer group"
                    >
                      {/* Title & Cover Icon */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20 text-xs font-bold text-primary shadow-2xs group-hover:scale-105 transition-transform">
                            📖
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-foreground block truncate max-w-xs group-hover:text-primary transition-colors">
                              {book.name}
                            </span>
                            {book.name_ml && (
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {book.name_ml}
                              </span>
                            )}
                            <span className="inline-block text-[10px] text-primary capitalize font-medium">
                              {book.category || "General"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ISBN */}
                      <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap">
                        {book.isbn ? (
                          <button
                            type="button"
                            onClick={(e) => copyToClipboard(book.isbn!, e)}
                            title="Click to copy ISBN"
                            className="inline-flex items-center gap-1 rounded-md bg-black/5 dark:bg-white/5 px-2 py-0.5 font-bold hover:bg-primary/15 hover:text-primary transition cursor-pointer"
                          >
                            <span>{book.isbn}</span>
                            <span className="text-[9px] opacity-60">
                              {copiedIsbn === book.isbn ? "✓" : "📋"}
                            </span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground italic">Pending</span>
                        )}
                      </td>

                      {/* Edition & Binding */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-foreground block">
                          {book.edition} Edition
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {book.binding || "Paperback"} {book.pages ? `· ${book.pages} pp` : ""}
                        </span>
                      </td>

                      {/* MRP */}
                      <td className="py-3.5 px-4 text-right font-black text-foreground whitespace-nowrap">
                        {book.mrp_paise > 0 ? (
                          formatPaise(book.mrp_paise)
                        ) : (
                          <span className="text-muted-foreground font-normal italic">Unset</span>
                        )}
                      </td>

                      {/* Royalty Rate */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {book.contracts ? (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                            {book.contracts.royalty_pct}% ({book.contracts.basis.toUpperCase()})
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Standard</span>
                        )}
                      </td>

                      {/* Warehouse Stock */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-extrabold text-foreground">
                          {book.stock.toLocaleString()} copies
                        </span>
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Active Catalog
                        </span>
                      </td>

                      {/* Sales Channels */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 text-[9px] font-bold">
                          {[
                            { id: "retail", label: "Store" },
                            { id: "dealer", label: "Dealers" },
                            { id: "fair", label: "Fairs" },
                            { id: "online", label: "Web" },
                          ].map((ch) => {
                            const isLive = activeChannels.includes(ch.id);
                            return (
                              <span
                                key={ch.id}
                                className={`rounded px-1.5 py-0.5 ${
                                  isLive
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "bg-black/5 text-muted-foreground opacity-40"
                                }`}
                              >
                                {ch.label}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Deliverable preview button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {proj && (proj.final_layout_path || proj.final_cover_path) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewProject({
                                id: proj.id,
                                title: book.name,
                                hasLayout: Boolean(proj.final_layout_path),
                                hasCover: Boolean(proj.final_cover_path),
                              });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition cursor-pointer"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Inspect</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedBook(book)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
                          >
                            <span>Details</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Specs Slide-Over Drawer */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedBook(null)}
          />

          <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4 mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-primary tracking-wider">
                  Official Publication Specs
                </span>
                <h3 className="text-lg font-black text-foreground   leading-snug">
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

            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-border bg-background/50 p-3.5 space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Catalog Data</h4>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <span className="block text-[10px]">ISBN-13</span>
                    <span className="font-mono font-bold text-foreground">{selectedBook.isbn || "Assigned"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Genre</span>
                    <span className="font-semibold text-foreground capitalize">{selectedBook.category || "General"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Edition</span>
                    <span className="font-semibold text-foreground">{selectedBook.edition} (Edition {selectedBook.edition_no})</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Format / Binding</span>
                    <span className="font-semibold text-foreground">{selectedBook.binding || "Paperback"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Page Count</span>
                    <span className="font-semibold text-foreground">{selectedBook.pages ? `${selectedBook.pages} pages` : "Standard"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Language</span>
                    <span className="font-semibold text-foreground">{selectedBook.language}</span>
                  </div>
                </div>
              </div>

              {/* Commercial Terms */}
              <div className="rounded-xl border border-border bg-background/50 p-3.5 space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Commercial &amp; Royalties</h4>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <span className="block text-[10px]">Retail Price (MRP)</span>
                    <span className="font-black text-foreground text-sm">{formatPaise(selectedBook.mrp_paise)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Royalty Rate</span>
                    <span className="font-semibold text-foreground">
                      {selectedBook.contracts ? `${selectedBook.contracts.royalty_pct}% (${selectedBook.contracts.basis.toUpperCase()})` : "10% MRP"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Contract Advance</span>
                    <span className="font-semibold text-foreground">
                      {selectedBook.contracts ? formatPaise(selectedBook.contracts.advance_paise) : "₹0.00"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px]">Agreement Date</span>
                    <span className="font-semibold text-foreground">
                      {selectedBook.contracts?.signed_on ? selectedBook.contracts.signed_on.slice(0, 10) : "Active"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Author Copies Delivery */}
              {selectedBook.production_projects && (
                <div className="rounded-xl border border-border bg-background/50 p-3.5 space-y-2">
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Author Complimentary Copies</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Allocated Copies:</span>
                    <strong className="text-foreground">{selectedBook.production_projects.author_copies_qty || 0} copies</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Dispatch Status:</span>
                    <span className={selectedBook.production_projects.author_copies_dispatched_at ? "text-emerald-600 font-bold" : "text-amber-600 font-semibold"}>
                      {selectedBook.production_projects.author_copies_dispatched_at
                        ? `✓ Dispatched (${selectedBook.production_projects.author_dispatch_tracking || "Delivered"})`
                        : "Preparing for dispatch"}
                    </span>
                  </div>
                </div>
              )}

              {/* In-browser preview action */}
              {selectedBook.production_projects && (selectedBook.production_projects.final_layout_path || selectedBook.production_projects.final_cover_path) && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewProject({
                      id: selectedBook.production_projects!.id,
                      title: selectedBook.name,
                      hasLayout: Boolean(selectedBook.production_projects!.final_layout_path),
                      hasCover: Boolean(selectedBook.production_projects!.final_cover_path),
                    });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Inspect Galley Proof &amp; Cover Art</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Protected Document Preview Modal */}
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
