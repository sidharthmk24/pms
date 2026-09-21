"use client";

import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { PhoneInput } from "@/components/ui/phone-input";
import { PlaceSelect } from "@/components/ui/place-select";

export default function AuthorRegisterClient({
  initialName = "",
  initialEmail = "",
  initialRef = "",
}: {
  initialName?: string;
  initialEmail?: string;
  initialRef?: string;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [place, setPlace] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Please enter your full author name / username (at least 2 characters).");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
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
          email: email.trim(),
          password,
          confirmPassword,
          phone: phone.trim() || undefined,
          place: place.trim() || undefined,
          avatar: avatar || undefined,
          ref: initialRef || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? data?.message ?? "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Hard redirect to personalized author dashboard to load session and author cookies cleanly
      window.location.href = data.redirect || "/author";
    } catch {
      setError("Could not reach the server. Please check your internet connection.");
      setLoading(false);
    }
  }

  const initialLetter = (name.trim() || email.trim() || "A").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#faf6f9]/60 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 animate-apple-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/publish" className="inline-flex items-center gap-2.5 group">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7e2562] text-white font-black text-xl shadow-plum-md group-hover:scale-105 transition-transform">
              K
            </span>
            <span className="text-2xl font-black tracking-tight text-foreground ">
              Kairali Books
            </span>
          </Link>

          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7e2562]/20 bg-[#faedf5] px-3.5 py-1 text-xs font-bold text-[#7e2562]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Author Portal Registration
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl ">
            Create Your Author Account
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Access your personalized Author Dashboard to track your manuscript in real time with live Amazon/Flipkart-style delivery progress, editorial notes, and digital contracts.
          </p>
        </div>

        {/* Linked Submission Notice */}
        {initialRef && (
          <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[11px]">
                ✓
              </span>
              <span>
                Linking Manuscript Reference: <strong className="font-mono text-emerald-950 font-bold">{initialRef}</strong>
              </span>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-bold text-emerald-700">
              Auto-Connected
            </span>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-3xl border border-[#7e2562]/15 bg-white p-6 sm:p-10 shadow-plum-md">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-800 animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo / Avatar Uploader */}
            <div className="flex flex-col items-center justify-center pb-2">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full overflow-hidden border-3 border-[#7e2562]/20 shadow-plum-sm bg-gradient-to-br from-[#7e2562] to-[#591443] flex items-center justify-center text-white">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="Author Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-extrabold">{initialLetter}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#7e2562] text-white shadow-plum-sm hover:bg-[#681b50] transition-transform active:scale-95 cursor-pointer"
                  title="Upload author portrait"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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

              <div className="mt-2.5 text-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-[#7e2562] hover:underline cursor-pointer"
                >
                  {avatar ? "Change Author Photo" : "Upload Author Portrait (Optional)"}
                </button>
                <p className="text-[11px] text-muted-foreground mt-0.5">JPEG, PNG or WEBP up to 5MB</p>
              </div>
            </div>

            {/* Author Name */}
            <div>
              <label htmlFor="name" className="mb-2 block text-xs font-bold   tracking-wider text-foreground">
                Author Full Name / Username <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand Neelakantan"
                  className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3.5 text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">Will appear on your publishing agreements and author profile</p>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-bold   tracking-wider text-foreground">
                Email Address <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="author@example.com"
                  className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3.5 text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Manuscripts submitted with this email address will be automatically linked to your dashboard.
              </p>
            </div>

            {/* Phone / WhatsApp Number */}
            <div>
              <PhoneInput
                id="reg-phone"
                name="phone"
                label="Phone / WhatsApp Number (Optional)"
                value={phone}
                onChange={(val) => setPhone(val)}
                hint="For editorial calls & direct WhatsApp publishing updates"
                isWhatsApp={true}
              />
            </div>

            {/* Town / District / Region */}
            <div>
              <PlaceSelect
                id="reg-place"
                name="place"
                label="Town / District / Region (Optional)"
                value={place}
                onChange={(val) => setPlace(val)}
                hint="Your residence in Kerala or diaspora location"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="text-xs font-bold   tracking-wider text-foreground">
                  Password <span className="text-rose-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-bold text-[#7e2562] hover:underline cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3.5 text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-xs font-bold   tracking-wider text-foreground">
                Confirm Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:ring-3 ${
                    confirmPassword && password === confirmPassword
                      ? "border-emerald-500 focus:border-emerald-600 focus:ring-emerald-500/15"
                      : "border-[#7e2562]/20 focus:border-[#7e2562] focus:ring-[#7e2562]/15"
                  }`}
                />
                {confirmPassword && password === confirmPassword && (
                  <span className="absolute right-4 top-3.5 text-emerald-600 font-bold text-sm">
                    ✓ Matches
                  </span>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="apple-button group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#7e2562] py-4 text-base font-extrabold text-white shadow-plum-md hover:bg-[#681b50] hover:shadow-plum-lg active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Setting Up Your Author Dashboard…</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration &amp; Open Dashboard</span>
                    <svg className="h-5 w-5 opacity-90 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-[11px] text-muted-foreground pt-1">
              By creating an account, you agree to the Kairali Books author submission policies and publishing guidelines.
            </p>
          </form>
        </div>

        {/* Existing User Navigation */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#7e2562] hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
