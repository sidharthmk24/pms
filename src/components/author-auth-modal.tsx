"use client";

import { useState, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export type ModalMode = "login" | "signup" | "forgot";

export interface OpenModalEventDetail {
  mode?: ModalMode;
  step?: number;
  initialAction?: "submit" | "explore";
  email?: string;
  redirectTo?: string;
}

export function openAuthorModal(options?: OpenModalEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OpenModalEventDetail>("open-author-modal", { detail: options })
  );
}

export function AuthorModalTrigger({
  mode = "login",
  className = "",
  children,
  title,
}: {
  mode?: ModalMode;
  step?: number;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (mode === "signup") {
          router.push("/publish/onboarding");
        } else {
          openAuthorModal({ mode: "login" });
        }
      }}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
}

export default function AuthorAuthModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleOpen = (e: CustomEvent<OpenModalEventDetail>) => {
      const targetMode = e.detail?.mode || "login";
      if (targetMode === "signup") {
        closeModal();
        router.push("/publish/onboarding");
        return;
      }

      setMode(targetMode === "forgot" ? "forgot" : "login");
      if (e.detail?.email) {
        setEmail(e.detail.email);
      }
      if (e.detail?.redirectTo) {
        setRedirectTo(e.detail.redirectTo);
      } else {
        setRedirectTo(null);
      }
      setErrorMsg("");
      setForgotSubmitted(false);
      setIsOpen(true);
    };

    window.addEventListener("open-author-modal" as any, handleOpen);

    // Check URL parameters / hash on mount
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      if (hash === "#signup" || hash === "#auth") {
        router.push("/publish/onboarding");
      } else if (params.get("open_modal") === "1" || params.get("need_login") === "1" || hash === "#login") {
        setMode("login");
        setIsOpen(true);
      }
    }

    return () => {
      window.removeEventListener("open-author-modal" as any, handleOpen);
    };
  }, [router]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const closeModal = () => {
    setIsOpen(false);
    setErrorMsg("");
    setForgotSubmitted(false);
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please provide both email and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Invalid email or password. Please try again.");
      }

      closeModal();
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.push("/author");
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your registered author email.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to send reset link. Please try again.");
      }

      setForgotSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Could not connect to server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToOnboarding = () => {
    closeModal();
    router.push("/publish/onboarding");
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-sm shadow-2xl border border-[#7E2562]/15 overflow-hidden transition-all transform animate-scaleUp">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeModal}
          aria-label="Close dialog"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-sm bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#7E2562] via-[#651D4E] to-[#4F143D] text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          {/* <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-white/15 text-white/90 text-xs font-semibold tracking-wide uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Kairali Books Author Portal
          </div> */}

          <h2 className="text-2xl font-bold text-white">
            {mode === "forgot" ? "Reset Your Password" : "Sign In to Author Portal"}
          </h2>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-sm">
            {mode === "forgot"
              ? "Enter your author email to receive a secure link to create a new password."
              : "Sign in to access your author dashboard, track manuscript reviews, and review proofing files."}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-sm bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-apple-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── MODE: LOGIN FORM ── */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-apple-in">
              {/* Quick Demo Fill */}
              <div className="flex items-center justify-between gap-2 p-2 bg-[#FAF5F8] border border-[#7E2562]/20 rounded-sm">
                <span className="text-[11px] font-bold text-[#7E2562] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Quick Demo Fill:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("author@kairalibooks.in");
                    setPassword("author123");
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold bg-white text-[#7E2562] border border-[#7E2562]/30 rounded-xs hover:bg-[#7E2562] hover:text-white transition-colors cursor-pointer"
                >
                  Demo Author
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Author Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="author@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrorMsg("");
                      setForgotSubmitted(false);
                    }}
                    className="text-xs font-semibold text-[#7E2562] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-sm bg-[#7E2562] hover:bg-[#681E51] text-white text-sm font-bold shadow-md shadow-[#7E2562]/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In 
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Single View Footer: Sign up CTA to Onboarding */}
              <div className="pt-4 mt-2 border-t border-neutral-100 text-center text-xs text-neutral-600">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={goToOnboarding}
                  className="font-bold text-[#7E2562] hover:text-[#5d1747] hover:underline cursor-pointer transition-colors"
                >
                  Sign up
                </button>
              </div>
            </form>
          )}

          {/* ── MODE: FORGOT PASSWORD FORM ── */}
          {mode === "forgot" && (
            <div className="space-y-4 animate-apple-in">
              {forgotSubmitted ? (
                <div className="space-y-5 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#7E2562]/10 text-[#7E2562]">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">Check your inbox</h3>
                    <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                      We sent a secure link to create a new password to{" "}
                      <strong className="text-neutral-900">{email}</strong>.
                    </p>
                  </div>
                  <div className="p-3 bg-[#FAF5F8] border border-[#7E2562]/15 rounded text-xs text-neutral-600 text-left">
                    <p className="font-semibold text-[#7E2562] mb-0.5">⏱️ Link expires in 1 hour</p>
                    <p>Click the link in the email to set your new password.</p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotSubmitted(false)}
                      className="w-full py-2.5 px-4 rounded-sm border border-[#7E2562]/30 text-[#7E2562] hover:bg-[#FAF5F8] text-xs font-bold cursor-pointer"
                    >
                      Resend Link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setForgotSubmitted(false);
                        setErrorMsg("");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#7E2562] hover:underline cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Sign In
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                      Your Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="author@example.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-sm bg-[#7E2562] hover:bg-[#681E51] text-white text-sm font-bold shadow-md shadow-[#7E2562]/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending Link...
                      </>
                    ) : (
                      <>
                        Send Password Reset Link
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setErrorMsg("");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-[#7E2562] transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Remember your password? Sign in
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
