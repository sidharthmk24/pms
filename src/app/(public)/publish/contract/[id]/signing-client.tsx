"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { formatPaise } from "@/lib/money";
import { parseContractNotes, PUBLISHER_DETAILS, type ContractMetadata } from "@/lib/contracts";
import { openAuthorModal } from "@/components/author-auth-modal";

type ContractData = {
  id: string;
  title_id: string;
  author_id: string;
  royalty_pct: number;
  basis: string;
  advance_paise: number;
  signed_on: string | null;
  term_notes: string | null;
  created_at: string;
  authors: {
    id: string;
    name: string;
    name_ml: string | null;
    email: string | null;
    phone: string | null;
    pan: string | null;
    address: string | null;
  };
  titles: {
    id: string;
    name: string;
    name_ml: string | null;
    category: string | null;
    language: string | null;
    stock: number;
    status: string;
  };
};

export default function SigningClient({
  contract,
  isVerified = true,
  authorEmail,
}: {
  contract: ContractData;
  isVerified?: boolean;
  authorEmail?: string | null;
}) {
  const meta: ContractMetadata = parseContractNotes(contract.term_notes);
  const alreadySigned = !!meta.author_signed_at;
  const isDeclined = meta.status === "declined" || !!meta.declined_at;

  const [sigMode, setSigMode] = useState<"upload" | "draw" | "type">("upload");
  const [typedName, setTypedName] = useState(contract.authors.name || "");
  const [pan, setPan] = useState(meta.author_pan || contract.authors.pan || "");
  const [bankAccount, setBankAccount] = useState(meta.author_bank_account || "");
  const [ifsc, setIfsc] = useState(meta.author_ifsc || "");
  const [agreed, setAgreed] = useState(alreadySigned);

  // Photo upload state (for senior authors signing on paper)
  const [uploadedSigImage, setUploadedSigImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSignedSuccess, setIsSignedSuccess] = useState(alreadySigned);
  const [signedDate, setSignedDate] = useState(meta.author_signed_at || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Renegotiation / Reassurance Modal State
  const [isRenegotiating, setIsRenegotiating] = useState(meta.renegotiation_requested ?? false);
  const [authorFeedback, setAuthorFeedback] = useState(meta.author_feedback || "");
  const [showReassuranceModal, setShowReassuranceModal] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (sigMode === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [sigMode]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, JPEG, WebP)");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Image file is too large (maximum 8MB). Please upload a smaller photo.");
      return;
    }

    setError(null);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedSigImage(result);
    };
    reader.readAsDataURL(file);
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (alreadySigned || isSignedSuccess) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleRenegotiateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackInput.trim() || feedbackInput.trim().length < 5) {
      setFeedbackError("Please provide details on what terms you would like reviewed (minimum 5 characters).");
      return;
    }

    setFeedbackSending(true);
    setFeedbackError(null);

    try {
      const res = await fetch(`/api/contracts/${contract.id}/renegotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: feedbackInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFeedbackError(data?.error ?? "Failed to submit renegotiation request");
      } else {
        setIsRenegotiating(true);
        setAuthorFeedback(feedbackInput.trim());
        setShowReassuranceModal(false);
        setFeedbackInput("");
      }
    } catch {
      setFeedbackError("Network error while submitting request. Please try again.");
    } finally {
      setFeedbackSending(false);
    }
  }

  async function handleSignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please confirm your agreement to all contract terms");
      return;
    }

    let finalSig = "";
    if (sigMode === "upload") {
      if (!uploadedSigImage) {
        setError("Please upload a photo of your signature or switch to Draw / Type signature");
        return;
      }
      finalSig = uploadedSigImage;
    } else if (sigMode === "draw") {
      if (!hasDrawn) {
        setError("Please draw your signature on the pad above or switch to Photo Upload / Type signature");
        return;
      }
      finalSig = canvasRef.current ? canvasRef.current.toDataURL("image/png") : "Drawn Signature";
    } else {
      if (!typedName.trim()) {
        setError("Please enter your full legal name for the digital signature");
        return;
      }
      finalSig = `Digitally Signed by ${typedName.trim()} (Typed Authentication)`;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${contract.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party: "author",
          signerName: typedName.trim() || contract.authors.name,
          signature: finalSig,
          pan: pan.trim().toUpperCase() || undefined,
          bankAccount: bankAccount.trim() || undefined,
          ifsc: ifsc.trim().toUpperCase() || undefined,
          agreed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error ?? "Failed to register signature");
      } else {
        setIsSignedSuccess(true);
        setIsRenegotiating(false);
        setSignedDate(new Date().toISOString().slice(0, 19).replace("T", " "));
      }
    } catch {
      setError("Network error while submitting signature. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      {/* Top Banner / Back to Author Dashboard & Print (Hidden on print) */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#7e2562]/10 pb-4">
        <Link
          href="/author"
          className="apple-button inline-flex items-center gap-2 rounded-xl border border-[#7e2562]/20 bg-white px-4 py-2 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/35 transition-all group cursor-pointer"
        >
          <svg className="h-4 w-4 text-[#7e2562] transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Author Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.open(`/publish/contract/${contract.id}/print`, "_blank")}
            className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-bold text-foreground shadow-2xs hover:bg-black/5 dark:border-white/10 dark:bg-surface dark:hover:bg-white/5 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Agreement (Offline / Paper)</span>
          </button>
          <span className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-mono font-bold text-foreground dark:border-white/10 dark:bg-surface">
            {meta.contract_ref || "CON-2026-0001"}
          </span>
        </div>
      </div>

      {/* Notice if Declined (Hidden on print) */}
      {isDeclined && (
        <div className="no-print mb-8 rounded-3xl border border-rose-300 bg-rose-50 p-6 text-foreground shadow-xs">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-xs">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-rose-900">
                Publishing Offer Concluded / Withdrawn
              </h3>
              <p className="mt-1 text-xs text-rose-800/90 leading-relaxed">
                This contract offer has concluded. {meta.decline_reason ? `Reason: "${meta.decline_reason}"` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reassurance Banner if Renegotiation is Active (Hidden on print) */}
      {!isSignedSuccess && !isDeclined && isRenegotiating && (
        <div className="no-print mb-8 rounded-3xl border-2 border-amber-300 bg-amber-50/80 p-6 text-foreground shadow-xs">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-base font-extrabold text-amber-950">
                  Terms Review in Progress by Managing Editor
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Manuscript Approved</span>
                </span>
              </div>
              <p className="mt-1.5 text-xs text-amber-900/90 leading-relaxed">
                You have requested revisions to the proposed publishing terms. Your feedback has been sent to our editorial board. You will receive an email once updated terms are assigned.
              </p>
              {authorFeedback && (
                <div className="mt-3 rounded-2xl border border-amber-300/80 bg-white/90 p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-900 block mb-0.5">Your Submitted Note:</span>
                  <p className="text-xs text-foreground italic whitespace-pre-wrap">
                    &ldquo;{authorFeedback}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Banner if Signed (Hidden on print) */}
      {isSignedSuccess && (
        <div className="no-print mb-8 rounded-3xl border border-success/30 bg-success/10 p-6 text-foreground shadow-xs">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success text-white shadow-xs">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-success">
                Agreement Successfully Dual-Signed!
              </h3>
              <p className="mt-1 text-xs text-foreground/80 leading-relaxed">
                This publishing contract is legally sealed by both Kairali Books and {contract.authors.name}.
                Your manuscript has automatically moved to our <strong>Production &amp; DTP Typesetting Pipeline</strong>.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.open(`/publish/contract/${contract.id}/print`, "_blank")}
                  className="apple-button rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background shadow-xs hover:opacity-90 cursor-pointer"
                >
                  Print / Download Official Signed PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Legal Agreement Document Card */}
      <div className="printable-contract overflow-hidden rounded-3xl border border-black/10 bg-surface shadow-2xl dark:border-white/10 dark:bg-surface">
        {/* Document Header */}
        <div className="border-b border-black/[0.06] bg-black/[0.02] p-8 text-center dark:border-white/[0.08] dark:bg-white/[0.02]">
          <span className="text-[11px] font-bold   tracking-widest text-primary block mb-2">
            Kairali Books Publishing Agreement
          </span>
          <h1 className="text-2xl font-black text-foreground sm:text-3xl  ">
            {contract.titles.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Author: <strong className="text-foreground font-semibold">{contract.authors.name}</strong> · Category: <span className="font-semibold text-foreground">{contract.titles.category || "General Literature"}</span>
          </p>
        </div>

        {/* Commercial Terms Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-black/[0.06] border-b border-black/[0.06] bg-surface-muted/30 dark:divide-white/[0.08] dark:border-white/[0.08]">
          <div className="p-4 text-center flex flex-col items-center justify-center">
            <span className="text-[11px] font-bold text-muted-foreground">Royalty Rate</span>
            <p className="mt-0.5 text-lg font-black text-foreground">{contract.royalty_pct}%</p>
            <span className="text-[10px] text-muted-foreground  ">{contract.basis} basis</span>
          </div>
          <div className="p-4 text-center flex flex-col items-center justify-center">
            <span className="text-[11px] font-bold text-muted-foreground">Advance on Signing</span>
            <p className="mt-0.5 text-lg font-black text-foreground">
              {contract.advance_paise > 0 ? formatPaise(contract.advance_paise) : "None"}
            </p>
            <span className="text-[10px] text-muted-foreground">Non-refundable</span>
          </div>
          <div className="p-4 text-center flex flex-col items-center justify-center">
            <span className="text-[11px] font-bold text-muted-foreground">Author Free Copies</span>
            <p className="mt-0.5 text-lg font-black text-foreground">{meta.free_copies}</p>
            <span className="text-[10px] text-muted-foreground">Complimentary</span>
          </div>
          <div className="p-4 text-center flex flex-col items-center justify-center">
            <span className="text-[11px] font-bold text-muted-foreground">Contract Term</span>
            <p className="mt-0.5 text-lg font-black text-foreground">{meta.term_years} Years</p>
            <span className="text-[10px] text-muted-foreground">Exclusive Print</span>
          </div>
        </div>

        {/* Legal Articles Text */}
        <div className="p-8 space-y-6 text-sm text-foreground/90 leading-relaxed  ">
          <div className="parties-box rounded-2xl border border-black/10 bg-black/[0.02] p-4 text-xs font-sans space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
            <p>
              <strong>PARTIES:</strong> <strong>Kairali Books</strong>, {PUBLISHER_DETAILS.address} (GSTIN: {PUBLISHER_DETAILS.gstin}) ("Publisher"), and <strong>{contract.authors.name}</strong>, {contract.authors.address || "Kerala, India"} ("Author").
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold font-sans text-foreground text-base">1. Grant of Publishing Rights</h3>
            <p>
              The Author grants the Publisher the exclusive right to print, publish, market, and distribute the literary work titled <strong>"{contract.titles.name}"</strong> in Malayalam throughout the world for an initial term of {meta.term_years} years.
            </p>

            <h3 className="font-bold font-sans text-foreground text-base">2. Royalty &amp; Accounting Statements</h3>
            <p>
              The Publisher shall pay the Author a royalty of <strong>{contract.royalty_pct}%</strong> for all copies sold. Royalty statements and payouts shall be accounted semi-annually, with Income Tax TDS deducted under Section 194J as required by Indian law.
            </p>

            <h3 className="font-bold font-sans text-foreground text-base">3. Editorial, Layout &amp; Proofreading</h3>
            <p>
              The Publisher shall handle DTP typesetting, page layout, and cover design. The Author shall be provided with final galley proofs and will have a 14-day review window to submit corrections prior to mass printing.
            </p>

            <h3 className="font-bold font-sans text-foreground text-base">4. Author Copies &amp; Purchase Privilege</h3>
            <p>
              The Author receives <strong>{meta.free_copies} complimentary printed copies</strong> upon publication, and is entitled to purchase additional copies for personal use at a <strong>{meta.author_discount_pct}% discount</strong> off the printed MRP.
            </p>

            <h3 className="font-bold font-sans text-foreground text-base">5. Copyright &amp; Rights Reversion</h3>
            <p>
              Copyright in the text and literary content remains with the Author © {new Date().getFullYear()} {contract.authors.name}. If the book goes out of print and the Publisher fails to reprint within 12 months of formal notice, all publishing rights automatically revert to the Author.
            </p>

            <h3 className="font-bold font-sans text-foreground text-base">6. Legal Jurisdiction</h3>
            <p>
              This Agreement shall be governed by the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the Courts in <strong>Kozhikode (Calicut), Kerala</strong>.
            </p>
          </div>

          {/* Publisher Digital Seal */}
          <div className="signature-box pt-6 border-t border-black/10 font-sans dark:border-white/10 break-inside-avoid">
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-muted-foreground   tracking-wider">
                    Publisher Digital Seal &amp; Authorization
                  </span>
                  <p className="mt-1 font-bold text-foreground">{meta.publisher_signatory || PUBLISHER_DETAILS.signatory}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Authorized by Publisher
                  </span>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {meta.publisher_signed_at?.slice(0, 16) || "Timestamp Verified"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Offline Paper Signature Block (Printed only when document is unsigned and not declined) */}
        {!isSignedSuccess && !isDeclined && (
          <div className="hidden print:block border-t border-black/10 p-8 font-sans break-inside-avoid">
            <div className="signature-box rounded-2xl border border-gray-400 p-5 bg-gray-50/50">
              <span className="text-[10px] font-bold text-gray-500   tracking-widest block mb-3">
                Signed by Author (Paper Execution Copy)
              </span>
              <div className="h-16 flex items-end pb-1 border-b border-gray-400 mb-2">
                <span className="text-xs text-gray-400 italic">
                  (Sign with pen above if submitting physical agreement)
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900">{contract.authors.name}</p>
              <p className="text-xs text-gray-600">PAN: {meta.author_pan || pan || "On File"}</p>
            </div>
          </div>
        )}

        {/* Digital Signature Form for Author (Hidden on Print) */}
        {isDeclined ? (
          <div className="no-print border-t border-rose-200 bg-rose-50/70 p-8 sm:p-10 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-xs">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-extrabold text-rose-950">
              Publishing Offer Concluded / Withdrawn
            </h3>
            <p className="text-xs sm:text-sm text-rose-800/90 max-w-md mx-auto leading-relaxed">
              This publishing agreement offer is closed and no longer accepting digital signatures. {meta.decline_reason ? `Note: "${meta.decline_reason}"` : ""}
            </p>
          </div>
        ) : !isSignedSuccess && !isVerified ? (
          <div className="no-print border-t border-[#7e2562]/15 bg-[#faf8fa] p-8 sm:p-10 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7e2562]/10 text-[#7e2562] shadow-2xs">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-0.5 text-[11px] font-bold text-amber-900 mb-2">
                <span>Identity Verification Required</span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-foreground">
                Author Login Required to Sign
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                To protect your intellectual property rights and ensure legal compliance under Indian IT Law, please log in with your registered author account ({authorEmail || "your author account"}) to review and execute this agreement.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  openAuthorModal({
                    mode: "login",
                    email: authorEmail || undefined,
                    redirectTo: `/publish/contract/${contract.id}`,
                  })
                }
                className="apple-button inline-flex items-center gap-2 rounded-2xl bg-[#7e2562] hover:bg-[#681b50] px-7 py-3.5 text-sm font-bold text-white shadow-plum-md hover:shadow-plum-lg active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Log In with Author Account</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        ) : !isSignedSuccess ? (
          <form onSubmit={handleSignSubmit} className="no-print border-t border-[#7e2562]/15 bg-[#faf8fa] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#7e2562]/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#7e2562]/20 bg-[#faedf5] px-3 py-0.5 text-[11px] font-bold text-[#7e2562] mb-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7e2562]" />
                  <span>Digital Contract Execution</span>
                </div>
                <h3 className="text-xl font-black tracking-tight text-foreground">
                  Author Signature &amp; Execution
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose your preferred signing method, verify your details, and execute the agreement.
                </p>
              </div>
            </div>

            {/* Tax & Bank Details */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  Author PAN Card <span className="text-muted-foreground font-normal">(for 194J TDS)</span>
                </label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-[#7e2562]/20 bg-white px-4 py-3 text-sm font-bold   tracking-wider text-foreground outline-none transition-all placeholder:text-muted-foreground/50 placeholder:font-normal focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15 shadow-2xs"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  Bank Account No. <span className="text-muted-foreground font-normal">(for Royalties)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789012"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full rounded-xl border border-[#7e2562]/20 bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 placeholder:font-normal focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15 shadow-2xs"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  Bank IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="SBIN0001234"
                  maxLength={11}
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-[#7e2562]/20 bg-white px-4 py-3 text-sm font-bold   tracking-wider text-foreground outline-none transition-all placeholder:text-muted-foreground/50 placeholder:font-normal focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15 shadow-2xs"
                />
              </div>
            </div>

            {/* Signature Method Mode Tabs */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-foreground">
                Choose Signature Method
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setSigMode("draw")}
                  className={`apple-button flex items-center gap-3.5 rounded-2xl border p-4 text-xs font-bold transition-all cursor-pointer text-left ${
                    sigMode === "draw"
                      ? "border-[#7e2562] bg-[#faedf5] text-[#7e2562] shadow-plum-xs ring-2 ring-[#7e2562]/20"
                      : "border-[#7e2562]/15 bg-white text-muted-foreground hover:border-[#7e2562]/30 hover:bg-[#faedf5]/25 shadow-2xs"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    sigMode === "draw" ? "bg-[#7e2562] text-white shadow-plum-xs" : "bg-[#7e2562]/10 text-[#7e2562]"
                  }`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground leading-tight">Draw on Screen</p>
                    <p className="text-[11px] font-normal text-muted-foreground mt-0.5">Mouse / Touchscreen</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSigMode("upload")}
                  className={`apple-button flex items-center gap-3.5 rounded-2xl border p-4 text-xs font-bold transition-all cursor-pointer text-left ${
                    sigMode === "upload"
                      ? "border-[#7e2562] bg-[#faedf5] text-[#7e2562] shadow-plum-xs ring-2 ring-[#7e2562]/20"
                      : "border-[#7e2562]/15 bg-white text-muted-foreground hover:border-[#7e2562]/30 hover:bg-[#faedf5]/25 shadow-2xs"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    sigMode === "upload" ? "bg-[#7e2562] text-white shadow-plum-xs" : "bg-[#7e2562]/10 text-[#7e2562]"
                  }`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground leading-tight">Upload Photo</p>
                    <p className="text-[11px] font-normal text-muted-foreground mt-0.5">Pen on paper photo</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSigMode("type")}
                  className={`apple-button flex items-center gap-3.5 rounded-2xl border p-4 text-xs font-bold transition-all cursor-pointer text-left ${
                    sigMode === "type"
                      ? "border-[#7e2562] bg-[#faedf5] text-[#7e2562] shadow-plum-xs ring-2 ring-[#7e2562]/20"
                      : "border-[#7e2562]/15 bg-white text-muted-foreground hover:border-[#7e2562]/30 hover:bg-[#faedf5]/25 shadow-2xs"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    sigMode === "type" ? "bg-[#7e2562] text-white shadow-plum-xs" : "bg-[#7e2562]/10 text-[#7e2562]"
                  }`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm3 3h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 13h.01M9 13h.01M12 13h.01M15 13h.01M18 13h.01M8 16h8" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground leading-tight">Type Name</p>
                    <p className="text-[11px] font-normal text-muted-foreground mt-0.5">Digital Typography</p>
                  </div>
                </button>
              </div>
            </div>

            {/* MODE 1: UPLOAD PHOTO OF SIGNATURE */}
            {sigMode === "upload" && (
              <div className="space-y-4 rounded-2xl border-2 border-dashed border-[#7e2562]/30 bg-[#faedf5]/25 p-6 text-center">
                <div className="mx-auto max-w-md space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7e2562]/10 text-[#7e2562]">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-extrabold text-foreground">
                    Sign on Paper &amp; Upload a Photo
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-left my-3 pt-2 border-t border-[#7e2562]/10">
                    <div className="rounded-xl bg-white p-2.5 border border-[#7e2562]/15 shadow-2xs">
                      <span className="text-[10px] font-extrabold text-[#7e2562] block">Step 1</span>
                      <p className="text-[11px] text-foreground/80 mt-0.5">Sign with pen on paper</p>
                    </div>
                    <div className="rounded-xl bg-white p-2.5 border border-[#7e2562]/15 shadow-2xs">
                      <span className="text-[10px] font-extrabold text-[#7e2562] block">Step 2</span>
                      <p className="text-[11px] text-foreground/80 mt-0.5">Take a photo on phone</p>
                    </div>
                    <div className="rounded-xl bg-white p-2.5 border border-[#7e2562]/15 shadow-2xs">
                      <span className="text-[10px] font-extrabold text-[#7e2562] block">Step 3</span>
                      <p className="text-[11px] text-foreground/80 mt-0.5">Upload image below</p>
                    </div>
                  </div>
                </div>

                {uploadedSigImage ? (
                  <div className="space-y-3">
                    <div className="inline-block rounded-2xl border-2 border-emerald-500/40 bg-white p-4 shadow-sm">
                      <span className="text-[10px] font-bold text-emerald-700   tracking-wider flex items-center justify-center gap-1 mb-1">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Signature Image Ready</span>
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadedSigImage}
                        alt="Uploaded Signature Preview"
                        className="max-h-24 max-w-[260px] object-contain mx-auto"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">{uploadedFileName}</p>
                    </div>
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="apple-button rounded-xl border border-[#7e2562]/20 bg-white px-4 py-2 text-xs font-bold text-[#7e2562] hover:bg-[#faedf5]/50 shadow-2xs cursor-pointer"
                      >
                        Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedSigImage(null);
                          setUploadedFileName("");
                        }}
                        className="apple-button rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="signature-file-input"
                    />
                    <label
                      htmlFor="signature-file-input"
                      className="apple-button inline-flex items-center gap-2 rounded-2xl bg-[#7e2562] hover:bg-[#681b50] px-6 py-3.5 text-xs font-extrabold text-white shadow-plum-sm hover:shadow-plum-md cursor-pointer transition-all"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Choose / Take Photo of Signature</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Supports JPG, PNG, WEBP files up to 8MB.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: DRAW SIGNATURE */}
            {sigMode === "draw" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Sign inside the box with your mouse or finger:
                  </span>
                  {hasDrawn && (
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Clear &amp; Re-draw</span>
                    </button>
                  )}
                </div>
                <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-[#7e2562]/30 bg-white shadow-2xs cursor-black-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={160}
                    className="h-40 w-full cursor-black-crosshair touch-none bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasDrawn && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-xs text-[#7e2562]/40 font-medium italic">
                      <svg className="h-4 w-4 text-[#7e2562]/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>Draw your signature here with your mouse, trackpad, or finger...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODE 3: TYPE SIGNATURE */}
            {sigMode === "type" && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-foreground">
                  Type Full Legal Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. C. Radhakrishnan"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full rounded-2xl border border-[#7e2562]/20 bg-white px-4 py-3.5 text-lg font-serif italic text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15 shadow-2xs"
                />
              </div>
            )}

            {/* Confirmation Checkbox */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-[#7e2562]/20 bg-white p-4.5 shadow-2xs">
              <input
                type="checkbox"
                id="certify-terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-[#7e2562]/30 text-[#7e2562] accent-[#7e2562] focus:ring-[#7e2562] cursor-pointer shrink-0"
              />
              <label htmlFor="certify-terms" className="text-xs text-foreground/90 leading-relaxed select-none cursor-pointer">
                I hereby accept and confirm that I have reviewed the publishing agreement terms above, that I am the sole author and copyright owner of <strong>"{contract.titles.name}"</strong>, and that this electronic execution carries full legal validity under the <em>Information Technology Act, 2000</em>.
              </label>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
                {error}
              </div>
            )}

            {/* Actions Grid: Perfectly Aligned & Balanced */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#7e2562]/15">
              <button
                type="submit"
                disabled={loading || !agreed}
                className="apple-button w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#7e2562] hover:bg-[#681b50] py-4 px-6 text-sm font-bold text-white shadow-plum-md hover:shadow-plum-lg active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer order-1 sm:order-1"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Digitally Sealing &amp; Executing...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Digitally Sign &amp; Accept Agreement</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowReassuranceModal(true)}
                className="apple-button w-full inline-flex items-center justify-center gap-2.5 rounded-2xl border border-[#7e2562]/30 bg-white hover:bg-[#faedf5]/60 py-4 px-6 text-sm font-bold text-[#7e2562] shadow-2xs hover:border-[#7e2562]/50 active:scale-[0.99] transition-all cursor-pointer order-2 sm:order-2"
              >
                <svg className="h-4.5 w-4.5 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{isRenegotiating ? "Update Revision Request / Message" : "Decline Terms & Request Offer Review"}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Sealed Author Stamp */
          <div className="signature-box border-t border-black/[0.06] bg-black/[0.015] p-8 dark:border-white/[0.08] dark:bg-white/[0.015] space-y-6 break-inside-avoid">
            <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-bold text-success   tracking-wider">
                    Author Signature Verified
                  </span>
                  <p className="mt-1 text-base font-extrabold text-foreground">{contract.authors.name}</p>
                  
                  {/* Signature Visual Rendering */}
                  {(meta.author_signature || uploadedSigImage) && (
                    <div className="mt-2.5">
                      {(meta.author_signature || uploadedSigImage)?.startsWith("data:image/") ? (
                        <div className="inline-block rounded-xl border border-black/10 bg-white p-2.5 shadow-2xs">
                          <img
                            src={meta.author_signature || uploadedSigImage || ""}
                            alt="Author Signature"
                            className="max-h-14 max-w-[220px] object-contain"
                          />
                        </div>
                      ) : (
                        <p className="font-serif italic text-sm text-foreground">
                          {meta.author_signature || `Digitally Signed by ${contract.authors.name}`}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    PAN: {meta.author_pan || pan || "On File"} · IP: {meta.author_signer_ip || "Verified"}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Legally Executed
                  </span>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {signedDate ? signedDate.slice(0, 16) : "Timestamp Certified"}
                  </p>
                </div>
              </div>
            </div>

          
          </div>
        )}
      </div>

      {/* REASSURANCE MODAL: Author Terms Review & Feedback */}
      {showReassuranceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#7e2562]/20 bg-white shadow-plum-lg">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#7e2562]/10 bg-[#faf4f8] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7e2562] text-white shadow-plum-xs">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground  ">
                    Request Publishing Terms Review
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-sans">
                    {contract.titles.name} · Kairali Books Editorial Cell
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReassuranceModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Reassurance Callout Box */}
            <form onSubmit={handleRenegotiateSubmit} className="p-6 space-y-4">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-4 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs mt-0.5">
                    ✓
                  </div>
                  <div className="text-xs text-emerald-950 leading-relaxed">
                    <strong className="font-extrabold text-emerald-900 block mb-0.5">
                      Your Manuscript Acceptance is 100% Safe with Us!
                    </strong>
                    Requesting a review will <strong>never cancel your manuscript approval</strong>. We value our authors as collaborative partners. If you wish to request adjustments to royalties, advance payments, contract duration, or complimentary copies, our managing editor will personally review your notes and can reassign an updated agreement.
                  </div>
                </div>
              </div>

              {/* Current Terms Summary for Reference */}
              <div className="rounded-xl border border-black/8 bg-black/[0.02] p-3 text-xs">
                <span className="font-bold text-foreground block mb-1">Current Proposed Terms:</span>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <div>Royalty: <strong className="text-foreground">{contract.royalty_pct}%</strong></div>
                  <div>Advance: <strong className="text-foreground">{contract.advance_paise > 0 ? formatPaise(contract.advance_paise) : "None"}</strong></div>
                  <div>Free Copies: <strong className="text-foreground">{meta.free_copies}</strong></div>
                </div>
              </div>

              {/* Author's Feedback Textarea */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  What terms would you like reviewed or adjusted? <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={feedbackInput}
                  onChange={(e) => {
                    setFeedbackInput(e.target.value);
                    if (e.target.value.trim().length >= 5) setFeedbackError(null);
                  }}
                  placeholder="e.g. I would appreciate if we could increase the royalty rate to 15% and provide 20 complimentary author copies for my local book launch..."
                  className="w-full rounded-xl border border-black/15 bg-white p-3 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20 resize-y"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Your direct note will be delivered securely to our editorial director.
                </p>
              </div>

              {feedbackError && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                  {feedbackError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReassuranceModal(false)}
                  className="apple-button flex-1 rounded-xl border border-black/15 bg-white py-2.5 text-xs font-bold text-foreground hover:bg-black/5 transition-all cursor-pointer"
                >
                  Back to Agreement
                </button>
                <button
                  type="submit"
                  disabled={feedbackSending || feedbackInput.trim().length < 5}
                  className="apple-button flex-1 rounded-xl bg-[#7e2562] py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-[#681b50] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {feedbackSending ? "Submitting Request..." : "Send Request to Editor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
