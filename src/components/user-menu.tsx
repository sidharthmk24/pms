"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initial = name ? name.charAt(0).toUpperCase() : "U";

  return (
    <div className="flex items-center gap-4">
      {/* User Info with Avatar */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-foreground text-sm font-bold text-background shadow-xs ring-1 ring-black/10 dark:ring-white/20">
          {initial}
        </div>
        <div className="hidden text-left leading-tight sm:block">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-foreground">{name}</span>
          </div>
          <span className="text-xs text-muted-foreground">{email}</span>
        </div>
      </div>

      {/* Sign Out Button */}
      <button
        onClick={signOut}
        disabled={pending}
        aria-label="Sign out"
        className="apple-button flex items-center gap-1.5 rounded-xl border border-black/10 bg-surface/90 px-3.5 py-2 text-[13px] font-semibold text-foreground shadow-xs hover:bg-black/5 hover:text-foreground dark:border-white/10 dark:bg-surface-muted/60 dark:hover:bg-white/10 disabled:opacity-50"
      >
        {pending ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        )}
        <span>Sign out</span>
      </button>
    </div>
  );
}

