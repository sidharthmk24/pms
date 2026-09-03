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
}: {
  statusLabels: Record<string, string>;
  editors: Editor[];
  currentStatus?: string;
  currentEditor?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onFilterChange(key: "status" | "editor", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `/submissions?${query}` : "/submissions");
  }

  const hasFilter = Boolean(currentStatus || currentEditor);

  return (
    <section className="relative z-20 rounded-[22px] border border-black/[0.08] bg-surface/90 p-4.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80">
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
