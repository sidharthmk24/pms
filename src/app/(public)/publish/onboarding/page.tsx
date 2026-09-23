"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PhoneInput } from "@/components/ui/phone-input";
import { PlaceSelect } from "@/components/ui/place-select";
import ArrowRight from "@/components/ui/arrow-right";
import {
  BookOpen,
  ArrowRight as LucideArrowRight,
  ArrowLeft,
  Check,
  UploadCloud,
  FileText,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Sparkles,
  ShieldCheck,
  Clock,
  Eye,
  EyeOff,
  AlertCircle,
  Copy,
  ChevronRight,
  Camera,
  CheckCircle2,
  BookMarked,
  LayoutDashboard,
  Compass,
  UserCheck,
  LogIn,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { GENRES, LANGUAGES, SYNOPSIS_MIN, MAX_UPLOAD_MB, ACCEPT_ATTR } from "@/lib/submission-fields";
import { openAuthorModal } from "@/components/author-auth-modal";

const AVAILABLE_GENRES = [
  "Novel / നോവൽ",
  "Poetry / കവിത",
  "Short Stories / ചെറുകഥ",
  "Essays / ലേഖനം",
  "Memoir & Biography / ജീവചരിത്രം",
  "Children's Literature / ബാലസാഹിത്യം",
  "Drama / നാടകം",
  "Translation / വിവർത്തനം",
  "Academic & Research / അക്കാദമികം",
  "Philosophy / തത്ത്വചിന്ത",
  "Travelogue / യാത്രാവിവരണം",
  "Self-Help & Mindset / പ്രചോദനം",
  "History & Culture / ചരിത്രം",
];

const DUMMY_ONBOARDING_MANUSCRIPTS = [
  {
    title: "Nilavinte Vazhikal",
    titleMl: "നിലാവിന്റെ വഴികൾ",
    genre: "novel",
    language: "Malayalam",
    synopsis: "A poignant narrative chronicling the transformative socio-cultural shifts in post-war Malabar through three generations of a traditional weaving family. Explores themes of memory, indigenous art forms, and modern disillusionment across 240 structured pages.",
  },
  {
    title: "Kadalinte Nizhalukal",
    titleMl: "കടലിന്റെ നിഴലുകൾ",
    genre: "novel",
    language: "Malayalam",
    synopsis: "A comprehensive family saga based along the North Malabar coastline spanning the late 20th century. Follows the lives of three seafaring generations navigating coastal trade, changing maritime economies, and personal sacrifice across 320 structured pages.",
  },
  {
    title: "Puzhayude Ormakal",
    titleMl: "പുഴയുടെ ഓർമ്മകൾ",
    genre: "novel",
    language: "Malayalam",
    synopsis: "Set along the banks of the Bharathapuzha, this poignant narrative captures the gradual erosion of traditional agrarian life in central Kerala, intertwining local folklore, monsoon memories, and the dreams of a migrating generation.",
  },
  {
    title: "Nizhalukalude Sangeetham",
    titleMl: "നിഴലുകളുടെ സംഗീതം",
    genre: "poetry",
    language: "Malayalam",
    synopsis: "A lyrical anthology of fifty-four reflective poems exploring urban isolation, philosophical musings on time, transient relationships, and ecological grief in modern Kerala, composed in contemporary free-verse rhythms.",
  },
];

export default function AuthorOnboardingPage() {
  const router = useRouter();
  const dummyManuscriptIdxRef = useRef(0);

  // Step state: 1: Account, 2: Profile/Genres, 3: Pathway Choice, 4: Manuscript details, 5: Success
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Step 1: Account fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [place, setPlace] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Profile fields
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [bio, setBio] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [pastPublications, setPastPublications] = useState("");

  // Step 4: Manuscript fields
  const [bookTitle, setBookTitle] = useState("");
  const [bookTitleMl, setBookTitleMl] = useState("");
  const [genre, setGenre] = useState<string>(GENRES[0].value);
  const [language, setLanguage] = useState("Malayalam");
  const [synopsis, setSynopsis] = useState("");
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Result state
  const [submittedRefNo, setSubmittedRefNo] = useState("");
  const [copiedRef, setCopiedRef] = useState(false);

  // Existing user detection modal state
  const [showExistingUserModal, setShowExistingUserModal] = useState(false);
  const [existingUserName, setExistingUserName] = useState("");
  const [existingUserDetected, setExistingUserDetected] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [modalPassword, setModalPassword] = useState("");
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [isModalLoggingIn, setIsModalLoggingIn] = useState(false);
  const [modalLoginError, setModalLoginError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setErrorMsg("");
  }, [step]);

  // Avatar upload handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Profile photo must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
      setErrorMsg("");
    };
    reader.readAsDataURL(file);
  };

  const toggleGenre = (genreName: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreName) ? prev.filter((g) => g !== genreName) : [...prev, genreName]
    );
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setErrorMsg(`Cover design file exceeds maximum size of ${MAX_UPLOAD_MB}MB.`);
      return;
    }
    setCoverFile(file);
    setErrorMsg("");
    if (file.type.startsWith("image/")) {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(URL.createObjectURL(file));
    } else {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  };

  const handleMalayalamKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleMalayalamInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const filtered = input.value.replace(/[a-zA-Z]/g, "");
    if (filtered !== input.value) {
      input.value = filtered;
    }
  };

  // Staging / Testing: Dummy data fillers
  const handleFillDummyStep1 = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setName("Dr. K. R. Madhavan");
    setEmail(`author.demo.${randomSuffix}@kairalibooks.org`);
    setPassword("Password@123");
    setConfirmPassword("Password@123");
    setPhone("9847123456");
    setPlace("Kozhikode");
  };

  const handleFillDummyStep2 = () => {
    setBio("Malayalam essayist and literary researcher exploring post-colonial themes in contemporary Kerala fiction.");
    setSelectedGenres(["Novel / നോവൽ", "Short Stories / ചെറുകഥ", "Essays / ലേഖനം"]);
    setPastPublications("Athmavinte Nizhalukal (2020), Samakalika Chinthakal (2023)");
  };

  const handleFillDummyStep4 = () => {
    const item = DUMMY_ONBOARDING_MANUSCRIPTS[dummyManuscriptIdxRef.current % DUMMY_ONBOARDING_MANUSCRIPTS.length];
    dummyManuscriptIdxRef.current += 1;
    const randomId = Math.floor(100 + Math.random() * 900);

    setBookTitle(item.title);
    setBookTitleMl(item.titleMl);
    setGenre(item.genre);
    setLanguage(item.language);
    setSynopsis(item.synopsis);
    setAgreedTerms(true);

    const sanitized = item.title.replace(/[^a-zA-Z0-9]/g, "_");
    const dummyFile = new File(
      [`Kairali Books - Demo manuscript content for onboarding.\nTitle: ${item.title}\nRef: ONBOARD-${randomId}`],
      `${sanitized}_Draft.pdf`,
      { type: "application/pdf" }
    );
    setManuscriptFile(dummyFile);
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg("Please enter your full legal or pen name (min 2 characters).");
      return false;
    }
    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      setErrorMsg("Please enter a valid email address.");
      return false;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return false;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setErrorMsg("Please provide an active phone or WhatsApp contact number.");
      return false;
    }
    if (!place.trim()) {
      setErrorMsg("Please provide your city, district, or place.");
      return false;
    }
    setErrorMsg("");
    return true;
  };

  const checkEmailExists = async (emailToCheck: string, suppressModal = false) => {
    const trimmed = emailToCheck.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) return false;

    setIsCheckingEmail(true);
    try {
      const res = await fetch("/api/public/author/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();
      const exists = Boolean(json.ok && (json.data?.exists ?? json.exists));

      if (exists) {
        const foundName = json.data?.name || json.name || "";
        setExistingUserName(foundName);
        setExistingUserDetected(true);
        if (password) {
          setModalPassword(password);
        }
        setModalLoginError("");
        if (!suppressModal) {
          setShowExistingUserModal(true);
        }
        setErrorMsg("This user already exists on Kairali Books. Please log in with your password to continue.");
        return true;
      } else {
        setExistingUserDetected(false);
      }
      return false;
    } catch (err) {
      console.error("Email verification check failed:", err);
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setErrorMsg("");
    const alreadyExists = await checkEmailExists(email, false);
    if (alreadyExists) {
      return;
    }

    setStep(2);
  };

  const handleModalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPassword) {
      setModalLoginError("Please enter your password to log in.");
      return;
    }

    setIsModalLoggingIn(true);
    setModalLoginError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: modalPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setModalLoginError(data.error || "Incorrect password. Please try again.");
        setIsModalLoggingIn(false);
        return;
      }

      // Successful login redirect to author portal
      router.push("/author");
      router.refresh();
    } catch (err: any) {
      setModalLoginError("Could not reach server. Please try again.");
      setIsModalLoggingIn(false);
    }
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setStep(3);
  };

  // Skip manuscript for now (register author immediately and go to dashboard)
  const handleSkipToDashboard = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/public/author/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          avatar: avatarPreview || undefined,
          phone: phone.trim(),
          place: place.trim(),
          bio: bio.trim(),
          interests: selectedGenres,
          pastPublications: pastPublications.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Registration failed. Please try again.");
      }

      router.push("/author");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create author account. Please check your details.");
      setIsSubmitting(false);
    }
  };

  // Submit manuscript + register in Step 4
  const handleFinalSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) {
      setErrorMsg("Please provide your manuscript's title.");
      return;
    }
    if (synopsis.trim().length < SYNOPSIS_MIN) {
      setErrorMsg(`Synopsis must be at least ${SYNOPSIS_MIN} characters (currently ${synopsis.trim().length}).`);
      return;
    }
    if (!manuscriptFile) {
      setErrorMsg("Please upload your manuscript file (.pdf, .docx, .odt).");
      return;
    }
    if (!agreedTerms) {
      setErrorMsg("Please accept the author declaration to proceed.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // 1. Register Author Account (this creates session cookie)
      const regRes = await fetch("/api/public/author/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          avatar: avatarPreview || undefined,
          phone: phone.trim(),
          place: place.trim(),
          bio: bio.trim(),
          interests: selectedGenres,
          pastPublications: pastPublications.trim(),
        }),
      });

      const regData = await regRes.json();
      if (!regRes.ok || !regData.ok) {
        throw new Error(regData.error || "Could not set up author account. Please try again.");
      }

      // 2. Submit Manuscript file
      const formData = new FormData();
      formData.append("author_name", name.trim());
      formData.append("author_name_ml", "");
      formData.append("phone", phone.trim());
      formData.append("place", place.trim());
      formData.append("title", bookTitle.trim());
      formData.append("title_ml", bookTitleMl.trim());
      formData.append("genre", genre);
      formData.append("language", language);
      formData.append("synopsis", synopsis.trim());
      formData.append("manuscript", manuscriptFile);
      if (coverFile) {
        formData.append("cover", coverFile);
      }

      const subRes = await fetch("/api/public/submissions", {
        method: "POST",
        body: formData,
      });

      const subData = await subRes.json();
      if (!subRes.ok || !subData.ok) {
        throw new Error(subData.error || "Account created, but manuscript submission failed. You can re-upload from your dashboard.");
      }

      setSubmittedRefNo(subData.data?.refNo || "SUB-CONFIRMED");
      setStep(5);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyRefCode = () => {
    if (!submittedRefNo) return;
    navigator.clipboard.writeText(submittedRefNo);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF5F8] via-[#F6EEF3] to-white text-[#2B1B24] py-8 sm:py-12 px-4 sm:px-6">
      {/* ── EXISTING USER DETECTED MODAL ───────────────────────────── */}
      {showExistingUserModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowExistingUserModal(false);
              setTimeout(() => emailInputRef.current?.focus(), 100);
            }
          }}
        >
          <div className="relative w-full max-w-md bg-white rounded-sm border border-[#7E2562]/25 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowExistingUserModal(false);
                setTimeout(() => emailInputRef.current?.focus(), 100);
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 p-1.5 rounded-sm transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-3.5 pr-6">
              <div className="w-11 h-11 rounded-sm bg-[#FAF5F8] border border-[#7E2562]/20 text-[#7E2562] flex items-center justify-center shrink-0 shadow-2xs">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold  tracking-wider text-[#7E2562] bg-[#FAEDF5] px-2 py-0.5 rounded-sm mb-1">
                  <Sparkles className="w-3 h-3" />
                  Existing Account Detected
                </div>
                <h3 className="text-lg   font-bold text-[#2B1B24]">
                  User Already Exists
                </h3>
              </div>
            </div>

            {/* Information Notice */}
            <div className="rounded-sm bg-[#FAF5F8] border border-[#7E2562]/15 p-3.5 text-xs text-neutral-700 leading-relaxed space-y-1">
              <p>
                An account with <strong className="text-[#7E2562] font-mono">{email}</strong>
                {existingUserName ? ` (${existingUserName})` : ""} is already registered on Kairali Books.
              </p>
              <p className="text-neutral-500 font-normal">
                You do not need to create a new account. Please log in with your password to continue to your author portal.
              </p>
            </div>

            {/* Inline Login Form */}
            <form onSubmit={handleModalLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type={showModalPassword ? "text" : "password"}
                    required
                    value={modalPassword}
                    onChange={(e) => setModalPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {modalLoginError && (
                <div className="p-2.5 rounded-sm bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalLoginError}</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isModalLoggingIn}
                  className="apple-button w-full py-3 px-4 rounded-sm bg-[#7E2562] hover:bg-[#681E51] text-white text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-sm shadow-[#7E2562]/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isModalLoggingIn ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Log In to Author Dashboard
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowExistingUserModal(false);
                    setTimeout(() => emailInputRef.current?.focus(), 100);
                  }}
                  className="apple-button w-full py-2.5 px-4 rounded-sm border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Use a Different Email Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        
        {/* Navigation Breadcrumb & Brand */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#7E2562]/10">
          <div className="flex items-center gap-3">
            <Link
              href="/publish"
              className="inline-flex items-center gap-1.5 text-xs font-semibold  tracking-wider text-[#7E2562] hover:text-[#5E1A48] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Publishing Info
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-medium">Already registered?</span>
            <button
              type="button"
              onClick={() => openAuthorModal({ mode: "login" })}
              className="text-xs font-bold text-[#7E2562] hover:underline"
            >
              Author Sign In
            </button>
          </div>
        </div>

        {/* Top Header Card */}
        {step < 5 && (
          <div className="bg-white rounded-sm p-6 sm:p-8 shadow-sm border border-[#7E2562]/10 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
              
                <h1 className="text-2xl sm:text-3xl  font-black text-[#2B1B24]">
                  {step === 1 && "Create Your Author Account"}
                  {step === 2 && "Author Profile & Literary Focus"}
                  {step === 3 && "Publication Pathway"}
                  {step === 4 && "Manuscript Submission"}
                </h1>
                <p className="text-sm text-neutral-600 mt-1">
                  {step === 1 && "Step 1 of 4: Setup your login credentials and personal author information."}
                  {step === 2 && "Step 2 of 4: Tell our editorial committee about your literary voice and focus."}
                  {step === 3 && "Step 3 of 4: Choose whether to submit your manuscript right now or later."}
                  {step === 4 && "Step 4 of 4: Upload your manuscript file and provide synopsis details."}
                </p>
              </div>

              {/* User Reference UI Style Progress Bar: [======] • • • with fluid stretch animation */}
              <div className="flex items-center gap-1.5 self-start sm:self-center px-4 py-2.5">
                {[1, 2, 3, 4].map((i) => {
                  const isActive = step === i;
                  const isDone = step > i;
                  return (
                    <motion.div
                      key={i}
                      className="h-1.5 rounded-full"
                      animate={{
                        width: isActive ? 48 : 6,
                        backgroundColor: isActive
                          ? "#7E2562"
                          : isDone
                          ? "rgba(126, 37, 98, 0.8)"
                          : "rgba(126, 37, 98, 0.2)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 26,
                        mass: 0.8,
                      }}
                      title={`Step ${i}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Global Error Notice */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-sm bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 shadow-sm animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* STEP 1: Account Credentials */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="bg-white rounded-sm p-6 sm:p-10 shadow-sm border border-[#7E2562]/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100">
              <div className="space-y-0.5">
                <h2 className="text-2xl  !font-bold text-[#2B1B24]">Step 1: Account Information</h2>
                <p className="text-xs sm:text-sm text-neutral-500">
                  You will use this email and password to log in to your personal author dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFillDummyStep1}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#7e2562] bg-[#faedf5] hover:bg-[#f3dcee] border border-[#7e2562]/20 rounded-sm shadow-2xs transition-all cursor-pointer"
                title="Populate test data for staging"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#7e2562]" />
                <span>Fill Dummy Data</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1.5">
                  Full Author Name / തൂലികാനാമം <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., K. Madhavan Nair or Anitha K."
                    className="w-full pl-10 pr-4 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1.5">
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (existingUserDetected) setExistingUserDetected(false);
                    }}
                    onBlur={() => {
                      if (email.trim() && email.includes("@") && email.includes(".")) {
                        checkEmailExists(email, false);
                      }
                    }}
                    placeholder="author@example.com"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-sm border ${
                      existingUserDetected
                        ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-200"
                        : "border-neutral-200 focus:border-[#7E2562] focus:ring-[#7E2562]/20"
                    } focus:ring-2 outline-none text-sm transition-all`}
                  />
                </div>
                {existingUserDetected && (
                  <div className="mt-1.5 p-2.5 rounded-sm bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>This user already exists on Kairali Books.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (password) setModalPassword(password);
                        setShowExistingUserModal(true);
                      }}
                      className="font-bold text-[#7E2562] hover:underline cursor-pointer ml-2"
                    >
                      <span className="inline-flex items-center gap-1">Log in here <ArrowRight size={11} /></span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1.5">
                  Create Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1.5">
                  Confirm Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <PhoneInput
                  id="onboarding-phone"
                  name="phone"
                  label="Phone / WhatsApp Number"
                  value={phone}
                  onChange={(val) => setPhone(val)}
                  required={true}
                  hint="Active WhatsApp or phone number for editorial correspondence"
                  isWhatsApp={true}
                />
              </div>

              <div>
                <PlaceSelect
                  id="onboarding-place"
                  name="place"
                  label="Place / City / District"
                  value={place}
                  onChange={(val) => setPlace(val)}
                  required={true}
                  hint="Select your city or district"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => openAuthorModal({ mode: "login" })}
                className="text-xs text-[#7E2562] font-semibold hover:underline"
              >
                Already have an account? <span className="inline-flex items-center gap-1">Sign in <ArrowRight size={11} /></span>
              </button>

              <button
                type="submit"
                disabled={isCheckingEmail}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-[#7E2562] hover:bg-[#681E51] text-white text-sm font-bold shadow-md shadow-[#7E2562]/20 transition-all hover:scale-[1.01] disabled:opacity-60 cursor-pointer"
              >
                {isCheckingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking Account...
                  </>
                ) : (
                  <>
                    Continue to Author Profile
                    <LucideArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Profile, Bio, Genre Pills */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="bg-white rounded-sm p-6 sm:p-10 shadow-sm border border-[#7E2562]/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100">
              <div className="space-y-0.5">
                <h2 className="text-xl   font-bold text-[#2B1B24]">Step 2: Profile &amp; Literary Background</h2>
                <p className="text-xs sm:text-sm text-neutral-500">
                  Help our editorial board understand your literary domain and style.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFillDummyStep2}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#7e2562] bg-[#faedf5] hover:bg-[#f3dcee] border border-[#7e2562]/20 rounded-sm shadow-2xs transition-all cursor-pointer"
                title="Populate test profile for staging"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#7e2562]" />
                <span>Fill Dummy Data</span>
              </button>
            </div>

            {/* Avatar upload */}
            <div className="flex items-center gap-5 p-4 rounded-sm bg-[#FAF5F8] border border-[#7E2562]/15">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-full border-2 border-[#7E2562] overflow-hidden bg-white flex items-center justify-center shadow-sm">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Author Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-9 h-9 text-[#7E2562]/40" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#7E2562] text-white shadow hover:scale-110 transition-transform"
                  title="Upload profile picture"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div>
                <h4 className="text-sm font-bold text-[#2B1B24]">Author Profile Picture</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Optional. Recommended for your future book jacket and author directory page.
                </p>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="mt-2 text-xs font-semibold text-[#7E2562] hover:underline"
                >
                  {avatarPreview ? "Change Photo" : "Upload Photo (JPG/PNG)"}
                </button>
              </div>
            </div>

            {/* Bio textarea */}
            <div>
              <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1.5">
                Author Bio / Literary Background
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a short summary of your background, writing experience, or what inspires your literature..."
                className="w-full px-4 py-3 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all resize-none"
              />
            </div>

            {/* Genre selection pills */}
            <div>
              <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1">
                Your Primary Literary Genres / Categories
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Select one or more categories that represent your work:
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_GENRES.map((g) => {
                  const isSelected = selectedGenres.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGenre(g)}
                      className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#7E2562] text-white shadow-sm ring-2 ring-[#7E2562]/20"
                          : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Past Publications */}
            <div>
              <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1.5">
                Previous Publications or Awards <span className="text-xs font-normal text-neutral-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={pastPublications}
                onChange={(e) => setPastPublications(e.target.value)}
                placeholder="e.g. Published articles in Mathrubhumi, previous short story collection, or none"
                className="w-full px-4 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all"
              />
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Account
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-[#7E2562] hover:bg-[#681E51] text-white text-sm font-bold shadow-md shadow-[#7E2562]/20 transition-all hover:scale-[1.01]"
              >
                Continue to Pathway
                <LucideArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Choice - Submit Now vs Skip for Now */}
        {step === 3 && (
          <div className="bg-white rounded-sm p-6 sm:p-10 shadow-sm border border-[#7E2562]/10 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl   font-bold text-[#2B1B24]">Step 3: Choose Your Next Step</h2>
              <p className="text-xs sm:text-sm text-neutral-500">
                Do you have your manuscript file ready to submit today, or would you like to explore your author portal first?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Option A: Submit Manuscript Now */}
              <div className="rounded-sm border-2 border-[#7E2562] bg-gradient-to-b from-[#FAF5F8] to-white p-6 flex flex-col justify-between shadow-sm relative group hover:border-[#681E51] transition-all">
                <div className="absolute -top-3 right-4 bg-[#7E2562] text-white text-[10px] font-extrabold  tracking-wider px-2.5 py-0.5 rounded-sm shadow-sm">
                  Recommended
                </div>

                <div>
                  <div className="w-12 h-12 rounded-sm bg-[#7E2562]/15 text-[#7E2562] flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg   font-bold text-[#2B1B24]">
                    Submit Manuscript Now
                  </h3>
                  <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                    Upload your completed or draft manuscript (.pdf, .docx, .odt) and provide a book synopsis. Our editorial board begins review immediately.
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-neutral-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Free professional editorial review
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Assigned unique tracking reference
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Formal publishing proposal within 2 weeks
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="mt-6 w-full py-3 px-4 rounded-sm bg-[#7E2562] hover:bg-[#681E51] text-white text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-sm shadow-[#7E2562]/20 transition-all hover:scale-[1.01]"
                >
                  Upload Manuscript (Step 4)
                  <LucideArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Option B: Skip for Now */}
              <div className="rounded-sm border border-neutral-200 bg-white p-6 flex flex-col justify-between hover:border-[#7E2562]/40 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-sm bg-neutral-100 text-neutral-700 flex items-center justify-center mb-4">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg   font-bold text-[#2B1B24]">
                    Skip for Now (Go to Dashboard)
                  </h3>
                  <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                    Finish your registration now and access your author dashboard immediately. You can submit your manuscript at any time from your portal.
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-neutral-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      Explore author workspace & guide
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      Review formatting & typesetting rules
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      Submit manuscript whenever ready
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSkipToDashboard}
                  className="mt-6 w-full py-3 px-4 rounded-sm border-2 border-[#7E2562] text-[#7E2562] hover:bg-[#7E2562]/5 text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#7E2562] border-t-transparent rounded-full animate-spin" />
                      Setting Up Account...
                    </>
                  ) : (
                    <>
                      Complete Setup & Enter Dashboard
                      <LucideArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Profile
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Manuscript Submission Form */}
        {step === 4 && (
          <form onSubmit={handleFinalSubmission} className="bg-white rounded-sm p-6 sm:p-10 shadow-sm border border-[#7E2562]/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100">
              <div className="space-y-0.5">
                <h2 className="text-xl   font-bold text-[#2B1B24]">Step 4: Manuscript Details &amp; Upload</h2>
                <p className="text-xs sm:text-sm text-neutral-500">
                  Provide the details of your book. Upon submission, your account will be created and your manuscript logged with our editors.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFillDummyStep4}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#7e2562] bg-[#faedf5] hover:bg-[#f3dcee] border border-[#7e2562]/20 rounded-sm shadow-2xs transition-all cursor-pointer"
                title="Populate test manuscript details for staging"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#7e2562]" />
                <span>Fill Dummy Data</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1.5">
                  Book Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="e.g., Nizhalukalude Thazhvara"
                  className="w-full px-4 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1.5">
                  Book Title in Malayalam <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={bookTitleMl}
                  onKeyDown={handleMalayalamKeyDown}
                  onInput={handleMalayalamInput}
                  onChange={(e) => setBookTitleMl(e.target.value.replace(/[a-zA-Z]/g, ""))}
                  placeholder="ഉദാ: നിഴലുകളുടെ താഴ്വര"
                  className="w-full px-4 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all font-malayalam"
                />
                <p className="mt-1 text-xs text-neutral-400">മലയാളം അക്ഷരങ്ങൾ മാത്രം നൽകുക (English letters disabled)</p>
              </div>

              <div>
                <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1.5">
                  Genre / Category <span className="text-rose-600">*</span>
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm bg-white transition-all"
                >
                  {GENRES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.en} ({g.ml})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold  tracking-wider text-neutral-700 mb-1.5">
                  Manuscript Language <span className="text-rose-600">*</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm bg-white transition-all"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.en} ({l.ml})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Synopsis */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold  tracking-wider text-neutral-700">
                  Detailed Synopsis / സംഗ്രഹം <span className="text-rose-600">*</span>
                </label>
                <span
                  className={`text-xs font-medium ${
                    synopsis.trim().length >= SYNOPSIS_MIN ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {synopsis.trim().length} / {SYNOPSIS_MIN} characters min
                </span>
              </div>
              <textarea
                rows={5}
                required
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="Describe the central plot, key themes, protagonist journey, or philosophical scope of the work in detail (minimum 100 characters)..."
                className="w-full px-4 py-3 rounded-sm border border-neutral-200 focus:border-[#7E2562] focus:ring-2 focus:ring-[#7E2562]/20 outline-none text-sm transition-all"
              />
            </div>

            {/* Side-by-Side Square Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
              {/* Manuscript Document File */}
              <div className="flex flex-col h-full">
                <div className="mb-2">
                  <label htmlFor="manuscript" className="block text-xs font-bold tracking-wider text-neutral-700">
                    Manuscript Document File <span className="text-rose-600">*</span>
                  </label>
                </div>
                <div className="group relative flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#7e2562]/25 bg-[#faf6f9]/60 p-6 min-h-[220px] transition-all hover:border-[#7e2562]/60 hover:bg-[#faf6f9] cursor-pointer text-center">
                  <input
                    ref={fileInputRef}
                    id="manuscript"
                    name="manuscript"
                    type="file"
                    accept={ACCEPT_ATTR}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
                          setErrorMsg(`File exceeds maximum size of ${MAX_UPLOAD_MB}MB.`);
                          return;
                        }
                        setManuscriptFile(f);
                        setErrorMsg("");
                      }
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10"
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7e2562]/10 text-[#7e2562] mb-3 transition-transform duration-200 group-hover:scale-110 pointer-events-none">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                    <span className="rounded-xl bg-[#7e2562] px-4 py-2 text-xs font-bold text-white shadow-plum-sm group-hover:bg-[#681b50] transition-colors">
                      {manuscriptFile ? "Change File" : "Choose File"}
                    </span>
                    <span className="text-xs font-semibold text-foreground max-w-[200px] truncate">
                      {manuscriptFile ? manuscriptFile.name : "or click / drag and drop here"}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-[#7e2562] pointer-events-none">
                    {manuscriptFile
                      ? `✓ ${((manuscriptFile.size || 0) / 1024 / 1024).toFixed(2)} MB · Ready to upload`
                      : `PDF, DOC, DOCX or ODT · Max ${MAX_UPLOAD_MB} MB`}
                  </p>
                </div>
              </div>

              {/* Optional Cover Design Section */}
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="cover" className="block text-xs font-bold tracking-wider text-neutral-700">
                    Book Cover Design <span className="text-neutral-400 font-normal text-xs">(Optional)</span>
                  </label>
                  {coverFile && (
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      Remove Cover
                    </button>
                  )}
                </div>
                <div className="group relative flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#7e2562]/20 bg-[#faedf5]/30 p-6 min-h-[220px] transition-all hover:border-[#7e2562]/50 hover:bg-[#faedf5]/60 cursor-pointer text-center">
                  <input
                    ref={coverInputRef}
                    id="cover"
                    name="cover"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleCoverChange}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10"
                  />

                  {coverPreviewUrl ? (
                    <div className="flex flex-col items-center gap-2 pointer-events-none w-full max-w-[220px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverPreviewUrl}
                        alt="Cover Preview"
                        className="h-20 w-16 object-cover rounded-lg shadow-xs border border-gray-200"
                      />
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 truncate max-w-full">
                        ✓ {coverFile?.name}
                      </span>
                      <p className="text-[10px] text-muted-foreground">Click or drop to replace</p>
                    </div>
                  ) : coverFile ? (
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7e2562]/10 text-[#7e2562]">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-foreground truncate max-w-[180px]">{coverFile.name}</p>
                      <span className="text-[10px] text-emerald-700 font-semibold">✓ Document / PDF Attached</span>
                      <p className="text-[10px] text-muted-foreground">Click or drop to replace</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7e2562]/10 text-[#7e2562] mb-3 transition-transform duration-200 group-hover:scale-110 pointer-events-none">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                        <span className="rounded-xl border border-[#7e2562]/30 bg-white px-3.5 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs group-hover:bg-[#faedf5] transition-colors">
                          Choose Cover File
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          or click / drag and drop here
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground pointer-events-none">
                        PDF, PNG, JPG, or WEBP · Max {MAX_UPLOAD_MB} MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 p-4 rounded-sm bg-neutral-50 border border-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#7E2562] focus:ring-[#7E2562]"
              />
              <span className="text-xs text-neutral-600 leading-relaxed">
                I hereby declare that I am the sole author and owner of this manuscript, it does not infringe copyright, and I agree to Kairali Books{" "}
                <Link href="/terms" target="_blank" className="text-[#7E2562] underline">
                  Terms of Service
                </Link>{" "}
                and editorial evaluation policies.
              </span>
            </label>

            {/* Navigation buttons */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Pathway
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-sm bg-[#7E2562] hover:bg-[#681E51] text-white text-sm font-bold shadow-lg shadow-[#7E2562]/25 transition-all hover:scale-[1.01] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting Manuscript & Creating Account...
                  </>
                ) : (
                  <>
                    Submit Manuscript & Complete Registration
                    <LucideArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: SUCCESS CONFIRMATION */}
        {step === 5 && (
          <div className="bg-white rounded-sm p-8 sm:p-12 shadow-md border border-[#7E2562]/15 text-center space-y-6">
            <div className="w-20 h-20 rounded-sm bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-emerald-100/80 text-emerald-800 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                Registration & Submission Successful
              </div>
              <h2 className="text-2xl sm:text-3xl   font-bold text-[#2B1B24]">
                Welcome to Kairali Books, {name}!
              </h2>
              <p className="text-sm text-neutral-600 max-w-md mx-auto">
                Your author account has been created and your manuscript has been safely registered in our editorial intake queue.
              </p>
            </div>

            {/* Reference Box */}
            <div className="max-w-md mx-auto p-4 rounded-sm bg-[#FAF5F8] border border-[#7E2562]/20 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px]  font-bold tracking-wider text-neutral-500">
                  Tracking Reference Number
                </span>
                <div className="text-lg font-mono font-bold text-[#7E2562]">{submittedRefNo}</div>
              </div>

              <button
                type="button"
                onClick={copyRefCode}
                className="px-3 py-2 rounded-sm bg-white border border-[#7E2562]/20 text-xs font-semibold text-[#7E2562] hover:bg-[#7E2562]/5 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {copiedRef ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            {/* Timeline info */}
            <div className="max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
              <div className="p-3 rounded-sm bg-neutral-50 border border-neutral-100">
                <div className="text-[11px] font-bold text-neutral-700">1. Intake Screening</div>
                <div className="text-[10px] text-neutral-500 mt-1">3–5 business days preliminary review.</div>
              </div>
              <div className="p-3 rounded-sm bg-neutral-50 border border-neutral-100">
                <div className="text-[11px] font-bold text-neutral-700">2. Peer Review</div>
                <div className="text-[10px] text-neutral-500 mt-1">Detailed evaluation by literary experts.</div>
              </div>
              <div className="p-3 rounded-sm bg-neutral-50 border border-neutral-100">
                <div className="text-[11px] font-bold text-neutral-700">3. Proposal & Proof</div>
                <div className="text-[10px] text-neutral-500 mt-1">Contract and digital galley proofing.</div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/author"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-sm bg-[#7E2562] hover:bg-[#681E51] text-white text-sm font-bold shadow-md shadow-[#7E2562]/20 transition-all hover:scale-[1.01]"
              >
                Enter Author Dashboard
                <LucideArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
