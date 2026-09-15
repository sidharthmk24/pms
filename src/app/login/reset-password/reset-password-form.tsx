"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(4);

  // Validate token on initial mount
  useEffect(() => {
    if (!token) {
      setLoadingToken(false);
      setTokenValid(false);
      setTokenError("No reset token provided. Please use the link sent to your email.");
      return;
    }

    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok && data.ok) {
          setTokenValid(true);
          setUserEmail(data.data?.email || null);
          setUserName(data.data?.name || null);
        } else {
          setTokenValid(false);
          setTokenError(
            data?.error || "This password reset link is invalid or has expired. Please request a new one."
          );
        }
      } catch {
        setTokenValid(false);
        setTokenError("Unable to verify reset link. Please check your internet connection.");
      } finally {
        setLoadingToken(false);
      }
    }

    checkToken();
  }, [token]);

  // Countdown redirect on success
  useEffect(() => {
    if (!success) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [success, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match. Please verify both fields.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFormError(data?.error || "Failed to update password. Please try again.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch {
      setFormError("Network error. Could not connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  // 1. Loading token state
  if (loadingToken) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
        <div className="h-8 w-8 border-3 border-[#7e2562] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-muted-foreground">Verifying secure reset link…</p>
      </div>
    );
  }

  // 2. Token invalid / expired state
  if (!tokenValid) {
    return (
      <div className="space-y-6 text-center animate-apple-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">Link Expired or Invalid</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {tokenError || "This password reset link has expired or has already been used."}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/login/forgot-password"
            className="apple-button flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-bold text-white shadow-plum-md hover:bg-primary-hover hover:shadow-plum-lg"
          >
            <span>Request New Reset Link</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-[#7e2562] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // 3. Success state
  if (success) {
    return (
      <div className="space-y-6 text-center animate-apple-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#7e2562]/10 text-[#7e2562]">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">Password Reset Complete!</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Your new password has been safely updated. You can now log in to your Kairali Books account.
          </p>
        </div>

        <div className="rounded-sm border border-[#7e2562]/20 bg-[#faedf5]/50 p-4 text-xs text-[#7e2562] font-semibold">
          Redirecting to Sign In in {countdown}s…
        </div>

        <Link
          href="/login"
          className="apple-button flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-bold text-white shadow-plum-md hover:bg-primary-hover hover:shadow-plum-lg"
        >
          <span>Sign In Now</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const isLengthValid = password.length >= 8;
  const isMatch = password.length > 0 && password === confirmPassword;

  // 4. Form state
  return (
    <form onSubmit={onSubmit} className="space-y-5 animate-apple-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="h-4 w-4 text-[#7e2562]" />
          <h2 className="text-lg font-bold text-foreground">Create New Password</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {userName ? `Hi ${userName}, set` : "Set"} a strong, secure password for{" "}
          <span className="font-semibold text-foreground">{userEmail}</span>.
        </p>
      </div>

      {/* New Password */}
      <div>
        <label
          htmlFor="new-password"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          New Password
        </label>
        <div className="apple-input-container relative flex items-center rounded-sm border border-[#7e2562]/20 bg-white">
          <div className="pointer-events-none pl-3.5 text-muted-foreground" aria-hidden="true">
            <Lock className="h-4 w-4" />
          </div>
          <input
            id="new-password"
            name="new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            placeholder="Min. 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="apple-button mr-2 flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-[#7e2562]/10 hover:text-primary"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label
          htmlFor="confirm-password"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Confirm New Password
        </label>
        <div className="apple-input-container relative flex items-center rounded-sm border border-[#7e2562]/20 bg-white">
          <div className="pointer-events-none pl-3.5 text-muted-foreground" aria-hidden="true">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <input
            id="confirm-password"
            name="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            placeholder="Re-enter new password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="apple-button mr-2 flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-[#7e2562]/10 hover:text-primary"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="rounded-sm border border-[#7e2562]/15 bg-[#faedf5]/30 p-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
              isLengthValid ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-500"
            }`}
          >
            ✓
          </div>
          <span className={isLengthValid ? "text-emerald-700 font-semibold" : "text-muted-foreground"}>
            At least 8 characters
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
              isMatch ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-500"
            }`}
          >
            ✓
          </div>
          <span className={isMatch ? "text-emerald-700 font-semibold" : "text-muted-foreground"}>
            Passwords match
          </span>
        </div>
      </div>

      {/* Error Message */}
      {formError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-sm bg-rose-50 px-3.5 py-2.5 text-[13px] font-semibold text-rose-800 border border-rose-200 animate-apple-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting || !isLengthValid || !isMatch}
        className="apple-button relative flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-bold text-white shadow-plum-md hover:bg-primary-hover hover:shadow-plum-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Updating password…</span>
          </>
        ) : (
          <>
            <span>Set New Password</span>
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
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}
