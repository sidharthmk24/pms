"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [errorKey, setErrorKey] = useState(0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error || "Failed to process request. Please try again.");
        setErrorKey((prev) => prev + 1);
        setPending(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Cannot reach the server. Please check your internet connection.");
      setErrorKey((prev) => prev + 1);
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6 text-center animate-apple-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#7e2562]/10 text-[#7e2562]">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            If an account exists for <span className="font-semibold text-foreground">{email}</span>, we have sent a secure link to create a new password.
          </p>
        </div>

        <div className="rounded-sm border border-[#7e2562]/20 bg-[#faedf5]/50 p-4 text-xs text-muted-foreground text-left leading-relaxed">
          <p className="font-semibold text-[#7e2562] mb-1">⏱️ Link expires in 1 hour</p>
          <p>Please check your inbox (and spam or junk folders) and click the link to proceed.</p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setEmail("");
            }}
            className="apple-button flex w-full items-center justify-center gap-2 rounded-sm border border-[#7e2562]/20 bg-white px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-[#7e2562]/5"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            Send another reset link
          </button>

          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-[#7e2562] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      key={errorKey}
      onSubmit={onSubmit}
      className={`space-y-5 ${error ? "animate-apple-shake" : ""}`}
    >
      <div>
        <h2 className="text-lg font-bold text-foreground">Forgot your password?</h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Enter your registered email address and we will send you a secure link to create a new password.
        </p>
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
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            placeholder="you@kairalibooks.in"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-sm bg-rose-50 px-3.5 py-2.5 text-[13px] font-semibold text-rose-800 border border-rose-200 animate-apple-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={pending}
        className="apple-button relative flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-bold text-white shadow-plum-md hover:bg-primary-hover hover:shadow-plum-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Sending link…</span>
          </>
        ) : (
          <>
            <span>Send Reset Link</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {/* Back to Login Link */}
      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-[#7e2562] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Remember your password? Sign in
        </Link>
      </div>
    </form>
  );
}
