"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { formatRoleLabel } from "@/lib/roles";
import { PhoneInput } from "@/components/ui/phone-input";
import { PlaceSelect } from "@/components/ui/place-select";

export default function UserMenu({
  name: initialName,
  email,
  role = "author",
  initialAvatar = null,
  initialPhone = "",
  initialPlace = "",
}: {
  name: string;
  email: string;
  role?: string;
  initialAvatar?: string | null;
  initialPhone?: string;
  initialPlace?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [phone, setPhone] = useState(initialPhone);
  const [place, setPlace] = useState(initialPlace);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editName, setEditName] = useState(initialName);
  const [editAvatar, setEditAvatar] = useState<string | null>(initialAvatar);
  const [editPhone, setEditPhone] = useState(initialPhone);
  const [editPlace, setEditPlace] = useState(initialPlace);

  const [saving, setSaving] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isDropdownOpen) setIsDropdownOpen(false);
        if (isModalOpen && !saving) {
          closeModal();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDropdownOpen, isModalOpen, saving]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function openModal() {
    setIsDropdownOpen(false);
    setEditName(name);
    setEditAvatar(avatar);
    setEditPhone(phone);
    setEditPlace(place);
    setError(null);
    setSuccess(false);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
    setError(null);
    setSuccess(false);
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, or WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setEditAvatar(result);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    setEditAvatar(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!editName.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          avatar: editAvatar,
          phone: editPhone.trim(),
          place: editPlace.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? data?.message ?? "Failed to update profile. Try again.");
        setSaving(false);
        return;
      }

      // Update state locally for immediate visual responsiveness
      setName(editName.trim());
      setAvatar(editAvatar);
      setPhone(editPhone.trim());
      setPlace(editPlace.trim());
      setSuccess(true);
      setSaving(false);

      // Refresh server-side pages (such as the author dashboard welcome banner)
      router.refresh();

      // Automatically close modal after brief confirmation
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(false);
      }, 800);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setSaving(false);
    }
  }

  async function signOut() {
    setIsDropdownOpen(false);
    setLogoutPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initial = (name.trim() || email.trim() || "U").charAt(0).toUpperCase();

  return (
    <>
      {/* Combined Profile Trigger with Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
          className="group flex items-center gap-2.5 rounded-2xl border border-black/8 bg-white/90 py-1.5 pl-1.5 pr-3 shadow-2xs hover:border-[#7e2562]/30 hover:bg-[#faedf5]/40 transition-all cursor-pointer text-left"
          title="Click to open user menu"
        >
          {/* Avatar Container */}
          <div className="relative h-9 w-9 shrink-0 rounded-xl overflow-hidden border border-[#7e2562]/25 shadow-xs bg-gradient-to-br from-[#7e2562] to-[#591443] flex items-center justify-center text-white transition-transform group-hover:scale-105">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-black">{initial}</span>
            )}
          </div>

          {/* User Name & Portal Role */}
          <div className="hidden text-left leading-tight sm:block max-w-[130px]">
            <span className="text-xs sm:text-sm font-bold text-foreground truncate block group-hover:text-[#7e2562] transition-colors">
              {name}
            </span>
            {/* <span className="text-[10px] text-muted-foreground block truncate font-medium">
              {role === "author" ? "Author Portal" : formatRoleLabel(role)}
            </span> */}
          </div>

          {/* Chevron Indicator */}
          <svg
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              isDropdownOpen ? "rotate-180 text-[#7e2562]" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-60 sm:w-64 rounded-2xl border border-[#7e2562]/15 bg-white p-2 shadow-xl backdrop-blur-2xl animate-apple-in z-50">
            {/* User Header Section */}
            <div className="border-b border-black/[0.06] px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-[#7e2562] to-[#591443] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{email}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-md bg-[#7e2562]/10 px-2 py-0.5 text-[10px] font-bold capitalize text-[#7e2562]">
                  {role} Workspace
                </span>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="mt-1 space-y-0.5">
              <button
                type="button"
                onClick={openModal}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground hover:bg-[#faedf5]/60 hover:text-[#7e2562] transition-colors cursor-pointer text-left"
              >
                <svg className="h-4 w-4 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <span>Edit Profile</span>
                  <span className="block text-[10px] font-medium text-muted-foreground">Account &amp; details</span>
                </div>
              </button>

              <button
                type="button"
                onClick={signOut}
                disabled={logoutPending}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-left disabled:opacity-50"
              >
                {logoutPending ? (
                  <svg className="h-4 w-4 animate-spin text-rose-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
                <div className="flex-1 min-w-0">
                  <span>Sign out</span>
                  <span className="block text-[10px] font-medium text-rose-400">Log out of session</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5XL CENTERED MODAL DIALOG (Portaled directly to document.body) */}
      {isModalOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/65 backdrop-blur-md p-3 sm:p-6 md:p-8 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Author Profile Settings"
        >
          <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
            {/* Backdrop click listener */}
            <div className="fixed inset-0 -z-10" onClick={closeModal} aria-hidden="true" />

            <div
              className="relative z-10 w-full max-w-5xl rounded-[28px] sm:rounded-[32px] border border-[#7e2562]/20 bg-white p-6 sm:p-8 lg:p-10 shadow-2xl my-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-[#7e2562]/10 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    
                    <span className="text-xs text-muted-foreground font-medium">Account Settings</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-foreground  tracking-tight">
                    Author Profile &amp; Publishing Credentials
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Manage your author portrait, personal identity, and correspondence settings across Kairali PMS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="apple-button h-10 w-10 shrink-0 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-foreground flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
                  title="Close dialog"
                >
                  ✕
                </button>
              </div>

              {/* 5XL Content Layout: Split 2 Columns */}
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                {/* Left Column: Author Portrait & Identity Card (lg:col-span-4) */}
                <div className="lg:col-span-4 flex flex-col items-center text-center rounded-3xl border border-[#7e2562]/15 bg-gradient-to-b from-[#faf6f9] to-white p-7 shadow-xs">
                  <div className="relative group mb-4">
                    <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white shadow-plum-md bg-gradient-to-br from-[#7e2562] to-[#591443] flex items-center justify-center text-white">
                      {editAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={editAvatar} alt="Author Portrait" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-4xl font-extrabold">{initial}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#7e2562] text-white shadow-plum-sm hover:bg-[#681b50] transition-transform active:scale-95 cursor-pointer"
                      title="Change author portrait"
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
                      onChange={handlePhotoChange}
                    />
                  </div>

                  <h4 className="text-lg font-bold text-foreground  ">{editName || name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{email}</p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="apple-button rounded-xl bg-[#7e2562] px-4 py-2 text-xs font-bold text-white shadow-plum-xs hover:bg-[#681b50] transition-all cursor-pointer"
                    >
                      {editAvatar ? "Change Portrait" : "Upload Portrait"}
                    </button>
                    {editAvatar && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="apple-button rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="mt-6 border-t border-[#7e2562]/10 pt-4 w-full text-[11px] text-muted-foreground leading-relaxed text-left space-y-1.5">
                    <p className="flex items-center gap-1.5 font-medium text-foreground">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Appears in dashboard welcome banner</span>
                    </p>
                    <p className="flex items-center gap-1.5 font-medium text-foreground">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>High resolution JPEG, PNG, WEBP (up to 5MB)</span>
                    </p>
                    <p className="flex items-center gap-1.5 font-medium text-foreground">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Instant sync with publishing records</span>
                    </p>
                  </div>
                </div>

                {/* Right Column: Edit Profile Details Form (lg:col-span-8) */}
                <div className="lg:col-span-8 flex flex-col justify-between">
                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    {/* Author Full Name */}
                    <div>
                      <label htmlFor="user-name" className="mb-1.5 block text-xs font-bold   tracking-wider text-foreground">
                        Author Full Name / Username <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="user-name"
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Anand Neelakantan"
                        className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3.5 text-base font-semibold text-foreground outline-none transition-all focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Will appear on your publishing agreements, author portal, and manuscripts.
                      </p>
                    </div>

                    {/* Email Address (Bound & Read-only) */}
                    <div>
                      <div className="mb-1.5">
                        <label className="text-xs font-bold   tracking-wider text-muted-foreground">
                          Registered Email Address
                        </label>
                      </div>
                      <input
                        type="email"
                        disabled
                        value={email}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-muted-foreground cursor-not-allowed font-mono"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        All submitted manuscripts matching this email are automatically linked to your personal portal.
                      </p>
                    </div>

                    {/* 2-Column Grid: Phone and Town/District */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <PhoneInput
                          id="user-phone"
                          name="phone"
                          label="Phone / WhatsApp Number"
                          value={editPhone}
                          onChange={(val) => setEditPhone(val)}
                          hint="For direct WhatsApp & editorial calls"
                          isWhatsApp={true}
                        />
                      </div>

                      <div>
                        <PlaceSelect
                          id="user-place"
                          name="place"
                          label="Town / District / Region"
                          value={editPlace}
                          onChange={(val) => setEditPlace(val)}
                          hint="Your residence / district in Kerala"
                        />
                      </div>
                    </div>

                    {/* Feedback Banners */}
                    {error && (
                      <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-800 animate-in fade-in">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 animate-in fade-in flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px]">✓</span>
                        <span>Author profile credentials updated successfully!</span>
                      </div>
                    )}

                    {/* Modal Footer Actions */}
                    <div className="pt-6 border-t border-[#7e2562]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={signOut}
                        disabled={logoutPending}
                        className="apple-button inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign Out of Portal</span>
                      </button>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={closeModal}
                          disabled={saving}
                          className="apple-button rounded-2xl border border-gray-200 bg-white px-6 py-3 text-xs font-bold text-muted-foreground hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="apple-button group inline-flex items-center gap-2 rounded-2xl bg-[#7e2562] px-8 py-3.5 text-sm font-extrabold text-white shadow-plum-md hover:bg-[#681b50] hover:shadow-plum-lg active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
                        >
                          {saving ? (
                            <>
                              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>Saving Profile Changes…</span>
                            </>
                          ) : (
                            <>
                              <span>Save Profile Changes</span>
                              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
