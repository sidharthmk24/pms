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
  tone?: "default" | "warning" | "danger" | "success" | "primary";
  icon?: ReactNode;
}) {
  const toneClass = {
    default: "text-foreground",
    warning: "text-amber-700",
    danger: "text-rose-700",
    success: "text-emerald-700",
    primary: "text-[#7e2562]",
  }[tone];

  const toneBadge = {
    default: "bg-[#7e2562]/8 text-[#7e2562] border border-[#7e2562]/15",
    warning: "bg-amber-50 text-amber-800 border border-amber-200",
    danger: "bg-rose-50 text-rose-800 border border-rose-200",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    primary: "bg-[#7e2562]/10 text-[#7e2562] border border-[#7e2562]/20 font-bold",
  }[tone];

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-plum-md">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold   tracking-wider text-muted-foreground">
            {label}
          </p>
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7e2562]/8 text-[#7e2562] transition-transform duration-200 group-hover:scale-110">
              {icon}
            </div>
          )}
        </div>
        <p className={`numeric mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl ${toneClass}`}>
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


