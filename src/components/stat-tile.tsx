import type { ReactNode } from "react";

export default function StatTile({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
  icon?: ReactNode;
}) {
  const toneClass = {
    default: "text-foreground",
    warning: "text-warning dark:text-warning",
    danger: "text-danger dark:text-danger",
    success: "text-foreground",
  }[tone];

  const toneBadge = {
    default: "bg-black/[0.04] text-muted-foreground dark:bg-white/[0.06]",
    warning: "bg-warning/10 text-warning border border-warning/20",
    danger: "bg-danger/10 text-danger border border-danger/20",
    success: "bg-foreground/[0.06] text-foreground",
  }[tone];

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-black/[0.08] bg-surface/90 p-5.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] dark:border-white/[0.1] dark:bg-surface/80 dark:shadow-none">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-black/[0.04] text-foreground/80 transition-transform duration-200 group-hover:scale-110 dark:bg-white/[0.07] dark:text-foreground">
              {icon}
            </div>
          )}
        </div>
        <p className={`numeric mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${toneClass}`}>
          {value}
        </p>
      </div>

      {hint && (
        <div className="mt-4 flex items-center">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold leading-tight ${toneBadge}`}>
            {hint}
          </span>
        </div>
      )}
    </div>
  );
}


