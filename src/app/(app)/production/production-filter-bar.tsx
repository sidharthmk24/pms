"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SmoothDropdown } from "@/components/dropdown";

export default function ProductionFilterBar({
  statusLabels,
  categories,
  currentStatus,
  currentCategory,
  currentSort = "updated_desc",
}: {
  statusLabels: Record<string, string>;
  categories: string[];
  currentStatus?: string;
  currentCategory?: string;
  currentSort?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onFilterChange(key: "status" | "category" | "sort", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && !(key === "sort" && value === "updated_desc")) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `/production?${query}` : "/production");
  }

  const hasFilter = Boolean(
    currentStatus ||
    currentCategory ||
    (currentSort && currentSort !== "updated_desc")
  );

  const sortOptions = [
    { value: "updated_desc", label: "Recently Updated" },
    { value: "updated_asc", label: "Oldest Updated" },
    { value: "created_desc", label: "Newest Created" },
    { value: "created_asc", label: "Oldest Created" },
    { value: "title_asc", label: "Book Title (A → Z)" },
    { value: "title_desc", label: "Book Title (Z → A)" },
    { value: "author_asc", label: "Author (A → Z)" },
    { value: "author_desc", label: "Author (Z → A)" },
    { value: "status_asc", label: "Stage (A → Z)" },
  ];

  return (
    <section className="relative z-20 rounded-xl border border-[#7e2562]/15 bg-white p-3.5 sm:p-4 shadow-plum-sm">
      <div className="flex flex-wrap items-center gap-3.5">
        {/* Stage / Status Filter */}
        <div className="w-56">
          <SmoothDropdown
            id="production-status-filter"
            name="status"
            value={currentStatus ?? ""}
            onChange={(val) => onFilterChange("status", val)}
            ariaLabel="Filter by active stage"
            placeholder="All Stages"
            options={[
              { value: "", label: "All Stages" },
              ...Object.entries(statusLabels).map(([val, label]) => ({
                value: val,
                label,
              })),
            ]}
          />
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="w-52">
            <SmoothDropdown
              id="production-category-filter"
              name="category"
              value={currentCategory ?? ""}
              onChange={(val) => onFilterChange("category", val)}
              ariaLabel="Filter by genre / category"
              placeholder="All Categories"
              options={[
                { value: "", label: "All Categories" },
                ...categories.map((cat) => ({
                  value: cat,
                  label: cat.charAt(0).toUpperCase() + cat.slice(1),
                })),
              ]}
            />
          </div>
        )}

        {/* Sort By Dropdown */}
        <div className="w-52">
          <SmoothDropdown
            id="production-sort-filter"
            name="sort"
            value={currentSort || "updated_desc"}
            onChange={(val) => onFilterChange("sort", val)}
            ariaLabel="Sort production projects"
            placeholder="Sort by"
            options={sortOptions}
          />
        </div>

        {/* Actions */}
        {hasFilter && (
          <Link
            href="/production"
            className="apple-button inline-flex items-center rounded-xl border border-black/15 bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-xs hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60 dark:hover:bg-white/10"
          >
            Clear Filters
          </Link>
        )}
      </div>
    </section>
  );
}
