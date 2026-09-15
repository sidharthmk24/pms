"use client";

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";

interface AuthorSignupCardProps {
  currentUser?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

export default function AuthorSignupCard({ currentUser }: AuthorSignupCardProps) {
  const [mode, setMode] = useState<"register" | "login" | "forgot">("register");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Registration state
  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [place, setPlace] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needLoginNotice, setNeedLoginNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function checkHashAndParams() {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();

      if (
        hash === "#login" ||
        hash === "#signin" ||
        params.get("mode") === "login" ||
        params.get("tab") === "login"
      ) {
        setMode("login");
      } else if (
        hash === "#signup" ||
        hash === "#register" ||
        params.get("mode") === "register" ||
        params.get("tab") === "register"
      ) {
        setMode("register");
      }

      if (params.get("need_login") === "1") {
        setNeedLoginNotice(true);
      }
    }

    checkHashAndParams();
    window.addEventListener("hashchange", checkHashAndParams);

    const handleCustomMode = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: "register" | "login" }>;
      if (customEvent.detail?.mode) {
        setMode(customEvent.detail.mode);
        setError(null);
      }
    };
    window.addEventListener("author-mode", handleCustomMode);

    return () => {
      window.removeEventListener("hashchange", checkHashAndParams);
      window.removeEventListener("author-mode", handleCustomMode);
    };
  }, []);

  function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, or WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatar(result);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Please enter your full author name / username (at least 2 characters).");
      return;
    }

    if (!regEmail.trim() || !regEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (regPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (regPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/public/author/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: regEmail.trim(),
          password: regPassword,
          confirmPassword,
          phone: phone.trim() || undefined,
          place: place.trim() || undefined,
          avatar: avatar || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? data?.message ?? "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Hard redirect directly to manuscript submission page
      window.location.href = "/author/submit";
    } catch {
      setError("Could not reach the server. Please check your internet connection.");
      setLoading(false);
    }
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!loginEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!loginPassword) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Incorrect email or password. Please try again.");
        setLoading(false);
        return;
      }

      // Redirect straight to manuscript submission page
      window.location.href = "/author/submit";
    } catch {
      setError("Could not reach the server. Please check your internet connection.");
      setLoading(false);
    }
  }

  async function handleForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!loginEmail.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Failed to send reset link. Please try again.");
        setLoading(false);
        return;
      }

      setForgotSubmitted(true);
    } catch {
      setError("Could not reach the server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  // If user is already authenticated
  if (currentUser) {
    return (
      <div id="signup" className="scroll-mt-20 rounded-[32px] border border-[#7e2562]/20 bg-gradient-to-br from-white via-[#faf6f9] to-[#faedf5]/50 p-8 sm:p-12 shadow-plum-md text-center max-w-2xl mx-auto">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7e2562] text-white font-extrabold text-2xl shadow-plum-sm mb-4">
          ✓
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-bold text-emerald-800 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active Author Session
        </span>
        <h3 className="text-2xl sm:text-3xl font-black text-foreground   tracking-tight">
          Welcome back, {currentUser.name}!
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          You are signed in as <strong className="text-foreground">{currentUser.email}</strong>. Ready to submit your work for editorial review?
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/author/submit"
            className="apple-button inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-[#7e2562] px-8 py-4 text-base font-extrabold text-white shadow-plum-md hover:bg-[#681b50] hover:shadow-plum-lg transition-all"
          >
            <span>Submit Your Manuscript</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link
            href="/author"
            className="apple-button inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-[#7e2562]/25 bg-white px-6 py-4 text-sm font-bold text-[#7e2562] hover:bg-[#faedf5] transition-all"
          >
            <span>Author Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const initialLetter = (name.trim() || regEmail.trim() || "A").charAt(0).toUpperCase();

  return (
    <div
      id="auth"
      className="scroll-mt-24 relative rounded-[32px] border border-[#7e2562]/20 bg-white p-6 sm:p-10 lg:p-12 shadow-plum-lg"
    >
      {/* Target anchor points for hash links */}
      <span id="signup" className="absolute -top-24" />
      <span id="login" className="absolute -top-24" />

      {/* Notice when redirected because sign-in is required */}
      {needLoginNotice && (
        <div className="mb-7 rounded-2xl border-2 border-[#7e2562]/25 bg-gradient-to-r from-[#faedf5] via-white to-[#faedf5] p-5 shadow-plum-xs animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7e2562] text-white text-base shadow-plum-xs">
                🔐
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-foreground">
                  Sign In Required to Submit Your Manuscript
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Only registered authors can submit manuscripts. If you already have an account, sign in below. If you are new, register in under 1 minute.
                </p>
              </div>
            </div>

            {/* <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`apple-button rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  mode === "login"
                    ? "bg-[#7e2562] text-white shadow-plum-xs"
                    : "bg-white border border-[#7e2562]/25 text-[#7e2562] hover:bg-[#faedf5]"
                }`}
              >
                🔑 I Have an Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`apple-button rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  mode === "register"
                    ? "bg-[#7e2562] text-white shadow-plum-xs"
                    : "bg-white border border-[#7e2562]/25 text-[#7e2562] hover:bg-[#faedf5]"
                }`}
              >
                ✨ I&apos;m a New Author
              </button>
            </div> */}
          </div>
        </div>
      )}

      {/* Header & Mode Switcher Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#7e2562]/10">
        <div className="max-w-xl space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7e2562]/20 bg-[#faedf5] px-3.5 py-1 text-xs font-bold text-[#7e2562]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Author Intake Portal</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {mode === "login" ? "Sign In to Your Author Account" : "Create Your Author Account"}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {mode === "login"
              ? "Welcome back! Enter your registered credentials to proceed immediately to the manuscript submission form."
              : "Register once to access the Author Dashboard, submit manuscripts without re-entering contact details, track editorial milestones, and receive contracts."}
          </p>
        </div>

        {/* Large Mode Toggle Tabs */}
        <div className="flex items-center rounded-2xl border border-[#7e2562]/20 bg-[#faf6f9] p-1.5 shadow-2xs self-start lg:self-center">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`apple-button flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              mode === "login"
                ? "bg-[#7e2562] text-white shadow-plum-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-white/60"
            }`}
          >
            <span>I Have an Account (Log In)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`apple-button flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              mode === "register"
                ? "bg-[#7e2562] text-white shadow-plum-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-white/60"
            }`}
          >
            <span>New Author (Register)</span>
          </button>
        </div>
      </div>

      {/* ── MODE 1: REGISTER FORM ────────────────────────────────────────── */}
      {mode === "register" ? (
        <form onSubmit={handleRegister} className="mt-8 space-y-7 animate-in fade-in">
          {/* Author Portrait Upload Block */}
          <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-[#7e2562]/15 bg-[#faf6f9]/80 p-5">
            <div className="relative group shrink-0">
              <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-white shadow-plum-sm bg-gradient-to-br from-[#7e2562] to-[#541440] flex items-center justify-center text-white">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Author Portrait Preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-black">{initialLetter}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#7e2562] text-white shadow-xs hover:bg-[#681b50] transition-transform active:scale-95 cursor-pointer"
                title="Upload photo"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-foreground">Author Portrait / Photo</span>
                <span className="text-[10px] font-semibold text-[#7e2562] bg-[#faedf5] px-2 py-0.5 rounded">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Upload a clear photo. It will appear on your top navbar, dashboard welcome card, and author credentials.
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="apple-button rounded-lg bg-white border border-[#7e2562]/20 px-3 py-1.5 text-[11px] font-bold text-[#7e2562] hover:bg-[#faedf5] cursor-pointer"
                >
                  {avatar ? "Change Photo" : "Upload Photo (JPEG/PNG)"}
                </button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar(null)}
                    className="apple-button rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2-Column Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Author Full Name / Username */}
            <div>
              <label htmlFor="reg-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">
                Author Full Name / Username <span className="text-rose-600">*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. M. Mukundan, Anand"
                className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition-all focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Appears across your publishing agreements and portal</p>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="reg-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">
                Email Address <span className="text-rose-600">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="author@example.com"
                className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition-all focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Used for login and instant editorial decisions</p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">
                Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition-all focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">At least 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">
                Confirm Password <span className="text-rose-600">*</span>
              </label>
              <input
                id="reg-confirm"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition-all focus:ring-3 ${
                  confirmPassword && regPassword !== confirmPassword
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                    : "border-[#7e2562]/20 focus:border-[#7e2562] focus:ring-[#7e2562]/15"
                }`}
              />
              {confirmPassword && regPassword !== confirmPassword && (
                <p className="mt-1 text-[11px] font-bold text-rose-600">Passwords do not match</p>
              )}
            </div>

            {/* Phone Number (Optional) */}
            <div>
              <label htmlFor="reg-phone" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">
                WhatsApp / Mobile Phone (Optional)
              </label>
              <input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition-all focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">For direct editorial WhatsApp updates</p>
            </div>

            {/* Town / Place in Kerala (Optional) */}
            <div>
              <label htmlFor="reg-place" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">
                Town / District / Region (Optional)
              </label>
              <input
                id="reg-place"
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="e.g. Kozhikode, Thrissur, Ernakulam"
                className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition-all focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Your residence in Kerala or abroad</p>
            </div>
          </div>

          {/* Error Feedback */}
          {error && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-800 animate-in fade-in">
              {error}
            </div>
          )}

          {/* Registration Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-muted-foreground text-center sm:text-left">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="font-bold text-[#7e2562] hover:underline cursor-pointer"
              >
                Sign in here &rarr;
              </button>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="apple-button group inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-[#7e2562] px-8 py-4 text-sm font-extrabold text-white shadow-plum-md hover:bg-[#681b50] hover:shadow-plum-lg active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Creating Account…</span>
                </>
              ) : (
                <>
                  <span>Create Account &amp; Submit Manuscript</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : mode === "login" ? (
        /* ── MODE 2: LOGIN FORM ────────────────────────────────────────── */
        <form onSubmit={handleLogin} className="mt-8 space-y-6 max-w-lg mx-auto animate-in fade-in">
          <div className="rounded-2xl border border-[#7e2562]/15 bg-[#faf6f9]/80 p-4 text-center">
            <span className="text-xs font-bold text-foreground">Sign In to Your Author Account</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Enter your credentials to submit a new manuscript or view your active submissions.
            </p>
          </div>

          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">
              Registered Email Address <span className="text-rose-600">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="author@example.com"
              className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3.5 text-sm font-semibold text-foreground outline-none transition-all focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-foreground">
                Password <span className="text-rose-600">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setForgotSubmitted(false);
                }}
                className="text-[11px] font-bold text-[#7e2562] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Your account password"
                className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3.5 text-sm font-semibold text-foreground outline-none transition-all focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Error Feedback */}
          {error && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-800 animate-in fade-in">
              {error}
            </div>
          )}

          {/* Login Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-muted-foreground">
              Don&apos;t have an author account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className="font-bold text-[#7e2562] hover:underline cursor-pointer"
              >
                Register here &rarr;
              </button>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="apple-button group inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-[#7e2562] px-8 py-3.5 text-sm font-extrabold text-white shadow-plum-md hover:bg-[#681b50] hover:shadow-plum-lg active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing In…</span>
                </>
              ) : (
                <>
                  <span>Sign In &amp; Submit Manuscript</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* ── MODE 3: FORGOT PASSWORD FORM ──────────────────────────────── */
        <div className="mt-8 space-y-6 max-w-lg mx-auto animate-in fade-in">
          {forgotSubmitted ? (
            <div className="rounded-2xl border border-[#7e2562]/20 bg-[#faedf5]/40 p-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7e2562] text-white text-xl font-bold">
                ✓
              </div>
              <h4 className="text-xl font-black text-foreground">Password Reset Link Dispatched</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If an account is associated with <strong className="text-foreground">{loginEmail}</strong>, we have sent a secure link to create a new password. The link will expire in 1 hour.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setForgotSubmitted(false)}
                  className="text-xs font-bold text-[#7e2562] border border-[#7e2562]/25 px-4 py-2 rounded-xl hover:bg-white cursor-pointer"
                >
                  Resend Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setForgotSubmitted(false);
                    setError(null);
                  }}
                  className="apple-button rounded-xl bg-[#7e2562] px-5 py-2 text-xs font-bold text-white shadow-plum-xs cursor-pointer"
                >
                  Back to Sign In &rarr;
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-5">
              <div className="rounded-2xl border border-[#7e2562]/15 bg-[#faf6f9]/80 p-4 text-center">
                <span className="text-xs font-bold text-foreground">Reset Author Password</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Enter your registered author email to receive a password reset link.
                </p>
              </div>

              <div>
                <label htmlFor="forgot-author-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground">
                  Registered Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  id="forgot-author-email"
                  type="email"
                  required
                  autoFocus
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="author@example.com"
                  className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3.5 text-sm font-semibold text-foreground outline-none transition-all focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
                />
              </div>

              {/* Error Feedback */}
              {error && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-800 animate-in fade-in">
                  {error}
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="text-xs font-bold text-[#7e2562] hover:underline cursor-pointer"
                >
                  &larr; Remember password? Sign in
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="apple-button group inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-[#7e2562] px-8 py-3.5 text-sm font-extrabold text-white shadow-plum-md hover:bg-[#681b50] hover:shadow-plum-lg active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Sending Link…</span>
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
