"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SmoothDropdown } from "@/components/dropdown";

type Editor = {
  id: string;
  name: string;
};

export default function SubmissionsFilterBar({
  statusLabels,
  editors,
  currentStatus,
  currentEditor,
  currentSort = "submitted_desc",
}: {
  statusLabels: Record<string, string>;
  editors: Editor[];
  currentStatus?: string;
  currentEditor?: string;
  currentSort?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onFilterChange(key: "status" | "editor" | "sort", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && !(key === "sort" && value === "submitted_desc")) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `/submissions?${query}` : "/submissions");
  }

  const hasFilter = Boolean(
    currentStatus ||
    currentEditor ||
    (currentSort && currentSort !== "submitted_desc")
  );

  const sortOptions = [
    { value: "submitted_desc", label: "Newest Submitted" },
    { value: "submitted_asc", label: "Oldest Submitted" },
    { value: "title_asc", label: "Title (A → Z)" },
    { value: "title_desc", label: "Title (Z → A)" },
    { value: "author_asc", label: "Author (A → Z)" },
    { value: "author_desc", label: "Author (Z → A)" },
    { value: "ref_desc", label: "Ref # (Newest)" },
    { value: "ref_asc", label: "Ref # (Oldest)" },
  ];

  return (
    <section className="relative z-20 rounded-xl border border-[#7e2562]/15 bg-white p-3.5 sm:p-4 shadow-plum-sm">
      <div className="flex flex-wrap items-center gap-3.5">
        {/* Status Filter */}
        <div className="w-52">
          <SmoothDropdown
            id="status-filter"
            name="status"
            value={currentStatus ?? ""}
            onChange={(val) => onFilterChange("status", val)}
            ariaLabel="Filter by status"
            placeholder="All Statuses"
            options={[
              { value: "", label: "All Statuses" },
              ...Object.entries(statusLabels).map(([val, label]) => ({
                value: val,
                label,
              })),
            ]}
          />
        </div>

        {/* Assigned Editor Filter */}
        <div className="w-52">
          <SmoothDropdown
            id="editor-filter"
            name="editor"
            value={currentEditor ?? ""}
            onChange={(val) => onFilterChange("editor", val)}
            ariaLabel="Filter by assigned editor"
            placeholder="All Editors"
            options={[
              { value: "", label: "All Editors" },
              ...editors.map((u) => ({
                value: u.id,
                label: u.name,
              })),
            ]}
          />
        </div>

        {/* Sort By Dropdown */}
        <div className="w-52">
          <SmoothDropdown
            id="sort-filter"
            name="sort"
            value={currentSort || "submitted_desc"}
            onChange={(val) => onFilterChange("sort", val)}
            ariaLabel="Sort submissions"
            placeholder="Sort by"
            options={sortOptions}
          />
        </div>

        {/* Actions */}
        {hasFilter && (
          <Link
            href="/submissions"
            className="apple-button inline-flex items-center rounded-xl border border-black/15 bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-xs hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60 dark:hover:bg-white/10"
          >
            Clear Filters
          </Link>
        )}
      </div>
    </section>
  );
}
