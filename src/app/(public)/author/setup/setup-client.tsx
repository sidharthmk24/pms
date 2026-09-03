"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function AuthorSetupClient({
  initialEmail,
  contractId,
  authorName,
  bookTitle,
}: {
  initialEmail: string;
  contractId?: string;
  authorName?: string;
  bookTitle?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(authorName || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/author/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          password,
          contractId: contractId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error ?? "Failed to create author account. Please try again.");
        setLoading(false);
        return;
      }

      // Successful registration & session creation -> push to author dashboard
      router.replace("/author");
      router.refresh();
    } catch {
      setError("Cannot reach the server. Please check your connection.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background font-black text-xl shadow-md">
              K
            </span>
            <span className="text-2xl font-black tracking-tight text-foreground font-serif">
              Kairali Books
            </span>
          </Link>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Author Portal Setup
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {authorName ? `Welcome, ${authorName}` : "Create Your Author Account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {bookTitle
              ? `Set up your password to monitor "${bookTitle}" and manage your publishing works.`
              : "Access your submitted manuscripts, digital contracts, and live production pipelines."}
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-[28px] border border-black/10 bg-surface p-7 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-surface/90 sm:p-9">
          <form onSubmit={onSubmit} className="space-y-4.5">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-danger/25 bg-danger/10 p-3.5 text-xs font-bold text-danger animate-apple-shake"
              >
                {error}
              </div>
            )}

            {/* Author Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Author Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full or pen name"
                className="w-full rounded-xl border border-black/12 bg-background/80 px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-surface-muted/60"
              />
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="author@example.com"
                className="w-full rounded-xl border border-black/12 bg-background/80 px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-surface-muted/60"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Password <span className="text-[11px] font-normal lowercase">(min 8 chars)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-black/12 bg-background/80 px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-surface-muted/60"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-black/12 bg-background/80 px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:bg-surface focus:ring-2 focus:ring-foreground/5 dark:border-white/15 dark:bg-surface-muted/60"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="apple-button mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-extrabold text-background shadow-xs hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Activating Account...</span>
                </>
              ) : (
                <span>Activate & Access Author Portal</span>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-black/[0.06] pt-5 text-center text-xs text-muted-foreground dark:border-white/[0.08]">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-foreground hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
