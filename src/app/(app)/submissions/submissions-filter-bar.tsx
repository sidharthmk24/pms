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
  showEditorFilter = true,
}: {
  statusLabels: Record<string, string>;
  editors: Editor[];
  currentStatus?: string;
  currentEditor?: string;
  currentSort?: string;
  showEditorFilter?: boolean;
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
    (showEditorFilter && currentEditor) ||
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
    <section className={`relative z-20 rounded-xl border bg-white p-3.5 sm:p-4 transition-all duration-200 ${
      hasFilter ? "border-[#7e2562]/35 shadow-plum-md" : "border-[#7e2562]/15 shadow-plum-sm"
    }`}>
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
            buttonClassName={
              currentStatus
                ? "!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
                : ""
            }
            options={[
              { value: "", label: "All Statuses" },
              ...Object.entries(statusLabels).map(([val, label]) => ({
                value: val,
                label,
              })),
            ]}
          />
        </div>

        {/* Assigned Editor Filter (Admin / Manager only) */}
        {showEditorFilter && (
          <div className="w-52">
            <SmoothDropdown
              id="editor-filter"
              name="editor"
              value={currentEditor ?? ""}
              onChange={(val) => onFilterChange("editor", val)}
              ariaLabel="Filter by assigned editor"
              placeholder="All Editors"
              buttonClassName={
                currentEditor
                  ? "!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
                  : ""
              }
              options={[
                { value: "", label: "All Editors" },
                ...editors.map((u) => ({
                  value: u.id,
                  label: u.name,
                })),
              ]}
            />
          </div>
        )}

        {/* Sort By Dropdown */}
        <div className="w-52">
          <SmoothDropdown
            id="sort-filter"
            name="sort"
            value={currentSort || "submitted_desc"}
            onChange={(val) => onFilterChange("sort", val)}
            ariaLabel="Sort submissions"
            placeholder="Sort by"
            buttonClassName="!border-[#7e2562] !ring-2 !ring-[#7e2562]/30 !shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
            options={sortOptions}
          />
        </div>

        {/* Actions */}
        {hasFilter && (
          <Link
            href="/submissions"
            className="apple-button inline-flex items-center rounded-xl border border-[#7e2562]/20 bg-[#faedf5]/30 px-4 py-2.5 text-sm font-bold text-[#7e2562] shadow-xs hover:bg-[#faedf5] transition-all cursor-pointer"
          >
            Clear Filters
          </Link>
        )}
      </div>
    </section>
  );
}
