"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();

  // Mode: "login" | "forgot"
  const [view, setView] = useState<"login" | "forgot">("login");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [pending, setPending] = useState(false);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPending, setForgotPending] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  async function onLoginSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Invalid email or password");
        setErrorKey((prev) => prev + 1);
        setPending(false);
        return;
      }
      const targetPath =
        nextPath && nextPath !== "/" && nextPath !== "/dashboard"
          ? nextPath
          : body.user?.role === "author"
            ? "/author"
            : nextPath;
      router.replace(targetPath);
      router.refresh();
    } catch {
      setError("Cannot reach the server. Check your connection.");
      setErrorKey((prev) => prev + 1);
      setPending(false);
    }
  }

  async function onForgotSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const targetEmail = (forgotEmail || email).trim().toLowerCase();
    if (!targetEmail) {
      setForgotError("Please enter your email address.");
      return;
    }

    setForgotError(null);
    setForgotPending(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setForgotError(data?.error || "Failed to process request. Please try again.");
        setForgotPending(false);
        return;
      }

      setForgotSubmitted(true);
    } catch {
      setForgotError("Could not reach the server. Please check your internet connection.");
    } finally {
      setForgotPending(false);
    }
  }

  // ── VIEW 2: FORGOT PASSWORD ───────────────────────────────────────────
  if (view === "forgot") {
    if (forgotSubmitted) {
      return (
        <div className="space-y-6 text-center animate-apple-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#7e2562]/10 text-[#7e2562]">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground">Check your inbox</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              We sent a password reset link to{" "}
              <span className="font-bold text-foreground">{forgotEmail || email}</span>.
            </p>
          </div>

          <div className="rounded-sm border border-[#7e2562]/20 bg-[#faedf5]/60 p-3 text-left text-xs text-muted-foreground">
            <p className="font-semibold text-[#7e2562] mb-0.5">⏱️ Link expires in 1 hour</p>
            <p>Click the button in your email to create a new password.</p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setForgotSubmitted(false);
              }}
              className="apple-button flex w-full items-center justify-center gap-2 rounded-sm border border-[#7e2562]/20 bg-white px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-[#7e2562]/5"
            >
              Send another reset link
            </button>

            <button
              type="button"
              onClick={() => {
                setView("login");
                setForgotSubmitted(false);
                setForgotError(null);
              }}
              className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-[#7e2562] hover:underline pt-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </button>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={onForgotSubmit} className="space-y-4.5 animate-apple-in">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">Forgot password?</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enter your email to receive a password reset link.
          </p>
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="forgot-email"
            className="mb-1.5 block text-xs font-semibold   tracking-wider text-muted-foreground"
          >
            Email address
          </label>
          <div className="apple-input-container relative flex items-center rounded-sm border border-[#7e2562]/20 bg-white">
            <div className="pointer-events-none pl-3.5 text-muted-foreground" aria-hidden="true">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="forgot-email"
              name="forgot-email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={forgotEmail || email}
              onChange={(e) => {
                setForgotEmail(e.target.value);
                setEmail(e.target.value);
              }}
              className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              placeholder="you@kairalibooks.in"
            />
          </div>
        </div>

        {/* Error Message */}
        {forgotError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-sm bg-rose-50 px-3.5 py-2.5 text-[13px] font-semibold text-rose-800 border border-rose-200 animate-apple-in"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{forgotError}</span>
          </div>
        )}

        {/* Send Reset Link Button */}
        <button
          type="submit"
          disabled={forgotPending}
          className="apple-button relative mt-2 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-bold text-white shadow-plum-md hover:bg-primary-hover hover:shadow-plum-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {forgotPending ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Sending reset link…</span>
            </>
          ) : (
            <>
              <span>Send Reset Link</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {/* Back to Login */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setView("login");
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-[#7e2562] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Remember password? Sign in
          </button>
        </div>
      </form>
    );
  }

  // ── VIEW 1: LOGIN ─────────────────────────────────────────────────────
  return (
    <form
      key={errorKey}
      onSubmit={onLoginSubmit}
      className={`space-y-4.5 ${error ? "animate-apple-shake" : ""}`}
    >
      {/* Staging Quick-Fill Helpers */}
      <div className="flex items-center justify-between gap-2 p-2 bg-[#faedf5] border border-[#7e2562]/20 rounded-sm">
        <span className="text-[11px] font-bold text-[#7e2562] flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Demo Fill:
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEmail("admin@kairalibooks.in");
              setPassword("admin123");
            }}
            className="px-2 py-0.5 text-[10px] font-bold bg-white text-[#7e2562] border border-[#7e2562]/30 rounded-xs hover:bg-[#7e2562] hover:text-white transition-colors cursor-pointer"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail("editor@kairalibooks.in");
              setPassword("editor123");
            }}
            className="px-2 py-0.5 text-[10px] font-bold bg-white text-[#7e2562] border border-[#7e2562]/30 rounded-xs hover:bg-[#7e2562] hover:text-white transition-colors cursor-pointer"
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail("author@kairalibooks.in");
              setPassword("author123");
            }}
            className="px-2 py-0.5 text-[10px] font-bold bg-white text-[#7e2562] border border-[#7e2562]/30 rounded-xs hover:bg-[#7e2562] hover:text-white transition-colors cursor-pointer"
          >
            Author
          </button>
        </div>
      </div>

      {/* Email Field */}
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-semibold   tracking-wider text-muted-foreground"
        >
          Email address
        </label>
        <div className="apple-input-container relative flex items-center rounded-sm border border-[#7e2562]/20 bg-white">
          <div className="pointer-events-none pl-3.5 text-muted-foreground" aria-hidden="true">
            <Mail className="h-4 w-4" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setForgotEmail(e.target.value);
            }}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            placeholder="you@kairalibooks.in"
          />
        </div>
      </div>

      {/* Password Field */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-xs font-semibold   tracking-wider text-muted-foreground"
          >
            Password
          </label>
          <button
            type="button"
            onClick={() => {
              setForgotEmail(email);
              setForgotError(null);
              setForgotSubmitted(false);
              setView("forgot");
            }}
            className="text-xs font-semibold text-primary hover:underline hover:text-primary-hover transition-colors cursor-pointer"
          >
            Forgot password?
          </button>
        </div>
        <div className="apple-input-container relative flex items-center rounded-sm border border-[#7e2562]/20 bg-white">
          <div className="pointer-events-none pl-3.5 text-muted-foreground" aria-hidden="true">
            <Lock className="h-4 w-4" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="apple-button mr-2 flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-[#7e2562]/10 hover:text-primary cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Error Message with Alert Pill */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-sm bg-rose-50 px-3.5 py-2.5 text-[13px] font-semibold text-rose-800 border border-rose-200 animate-apple-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Action Button */}
      <button
        type="submit"
        disabled={pending}
        className="apple-button relative mt-2 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-bold text-white shadow-plum-md hover:bg-primary-hover hover:shadow-plum-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {pending ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Signing in…</span>
          </>
        ) : (
          <span>Sign In to PMS</span>
        )}
      </button>
    </form>
  );
}
