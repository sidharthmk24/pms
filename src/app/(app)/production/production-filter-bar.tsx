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
    <section className={`relative z-20 rounded-xl border bg-white p-3.5 sm:p-4 transition-all duration-200 ${
      hasFilter ? "border-[#7e2562]/35 shadow-plum-md" : "border-[#7e2562]/15 shadow-plum-sm"
    }`}>
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
            buttonClassName={
              currentStatus
                ? "!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
                : ""
            }
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
              buttonClassName={
                currentCategory
                  ? "!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
                  : ""
              }
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
            buttonClassName="!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
            options={sortOptions}
          />
        </div>

        {/* Actions */}
        {hasFilter && (
          <Link
            href="/production"
            className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5]/30 px-3.5 py-2 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/40 transition-all"
          >
            <span className="text-sm">✕</span>
            <span>Clear Filters</span>
          </Link>
        )}
      </div>
    </section>
  );
}
