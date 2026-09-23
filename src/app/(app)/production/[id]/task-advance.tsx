"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, X, FileText, Image as ImageIcon, Clock, Lock } from "lucide-react";
import StageConfirmModal from "@/components/stage-confirm-modal";
import ArrowRight from "@/components/ui/arrow-right";

const STAGE_VERBS: Record<string, string> = {
  dtp: "Typesetting & Layout (Upload Proofreading PDF)",
  editing: "Editing & Proofreading Review",
  cover_design: "Cover Design",
  isbn_registration: "ISBN Application & Registration",
  printing: "Press Printing & Order Quantity Specifications",
  final_proof: "Author & Editorial Final Proof Sign-Off",
  post_production: "Post-Production Intake & Handover",
};

const STAGE_TRANSITIONS: Record<string, { current: string; next: string; description: string }> = {
  dtp: {
    current: "Typesetting & Layout (DTP)",
    next: "Proofreading & Editing",
    description: "The formatted layout PDF will be locked and passed to the editorial review team.",
  },
  editing: {
    current: "Proofreading & Editing",
    next: "Book Cover Design",
    description: "Editorial proofreading corrections are confirmed and book jacket cover design will become active.",
  },
  cover_design: {
    current: "Book Cover Design",
    next: "ISBN Application & Registration",
    description: "Final book cover artwork is recorded and the project will proceed to official ISBN filing.",
  },
  isbn_registration: {
    current: "ISBN Allocation",
    next: "Press Printing & Stock Setup",
    description: "The allocated ISBN will be registered and the project will proceed to Press Printing & Order Quantity setup.",
  },
  printing: {
    current: "Press Printing & Stock Setup",
    next: "Author Final Proof",
    description: "Print run quantity and fixed author copies allocation will be saved, and digital proof review will be dispatched to the author.",
  },
  final_proof: {
    current: "Author Final Proof",
    next: "Completed & Published",
    description: "Formal author & editorial sign-off is confirmed. The book will be finalized and published to the catalog.",
  },
};

function FileUploadBox({
  id,
  file,
  onFileSelect,
  onFileRemove,
  accept,
  required,
  label,
  description,
  hint,
  iconType = "document",
}: {
  id: string;
  file: File | null;
  onFileSelect: (f: File | null) => void;
  onFileRemove: () => void;
  accept: string;
  required?: boolean;
  label: string;
  description?: string;
  hint?: string;
  iconType?: "document" | "image";
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-semibold   tracking-wider text-muted-foreground">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFileRemove();
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Remove File
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        required={required}
        onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
        className="hidden"
      />

      {file ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="group relative flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50/60 p-4 transition-all hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB · Click to choose a different file
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold text-primary group-hover:underline">
            Change File
          </span>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
            isDragOver
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-black/15 bg-white/70 hover:border-primary/50 hover:bg-white dark:border-white/15 dark:bg-surface-elevated/40 dark:hover:bg-surface-elevated"
          }`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110 mb-2.5">
            {iconType === "image" ? <ImageIcon className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
          </div>
          <p className="text-xs font-bold text-foreground">
            <span className="text-primary underline">Click to choose file</span> or drag &amp; drop here
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {hint || (iconType === "image" ? "PNG, JPG, WEBP, or PDF up to 50MB" : "PDF, DOC, DOCX up to 50MB")}
          </p>
        </div>
      )}

      {description && (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export default function TaskAdvance({
  projectId,
  status,
  isbnRequestedAt,
  isbnRequestRef,
  proofApprovedAt,
  proofEmailSentAt,
  hasLayout,
  authorCopiesQty = 10,
  initialPrintCopies = 1000,
  isEditMode = false,
  initialIsbn = "",
  initialApplicationRef = "",
  initialProofFeedback = "",
  onCancelEdit,
  onSuccess,
}: {
  projectId: string;
  status: string;
  isbnRequestedAt?: string | null;
  isbnRequestRef?: string | null;
  proofApprovedAt?: string | null;
  proofEmailSentAt?: string | null;
  hasLayout?: boolean;
  authorCopiesQty?: number;
  initialPrintCopies?: number;
  isEditMode?: boolean;
  initialIsbn?: string;
  initialApplicationRef?: string;
  initialProofFeedback?: string;
  onCancelEdit?: () => void;
  onSuccess?: (nextStage?: string) => void;
}) {
  const router = useRouter();
  const [isbn, setIsbn] = useState(initialIsbn || "");
  const [applicationRef, setApplicationRef] = useState(initialApplicationRef || isbnRequestRef || "");
  const [printQuantity, setPrintQuantity] = useState<number>(initialPrintCopies || 1000);
  const authorCopies = authorCopiesQty ?? 10;
  const [proofFeedbackText, setProofFeedbackText] = useState(initialProofFeedback || "");
  const [file, setFile] = useState<File | null>(null);
  const [authorConsentVerified, setAuthorConsentVerified] = useState(false);
  const [reworkNotes, setReworkNotes] = useState("");
  const [showRework, setShowRework] = useState(false);
  const [pending, setPending] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCustomAction, setPendingCustomAction] = useState<"approve" | "rework" | undefined>(undefined);

  // Determine current sub-step for ISBN (in normal advance mode)
  const isIsbnStep1 = !isEditMode && status === "isbn_registration" && !isbnRequestedAt;

  async function onResendProofEmail() {
    setSendingEmail(true);
    setEmailStatus(null);
    setError(null);

    try {
      const res = await fetch(`/api/production/${projectId}/send-proof-email`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error || "Failed to send proof approval email.");
      } else {
        setEmailStatus(`✓ Proof email dispatched to ${data.email} with layout PDF attached!`);
        router.refresh();
      }
    } catch {
      setError("Failed to connect to email service.");
    } finally {
      setSendingEmail(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent, customAction?: "approve" | "rework") {
    e.preventDefault();
    if (isEditMode) {
      // Direct save in edit mode without modal
      executeSubmit(customAction);
      return;
    }

    // Confirmation modal is only required for:
    // 1. Author rework requests
    // 2. Final proof completion / book publishing
    // 3. Step 2 of ISBN Registration (ISBN allocation & proof email dispatch to author)
    const requiresConfirmModal =
      customAction === "rework" ||
      status === "final_proof" ||
      (status === "isbn_registration" && !isIsbnStep1);

    if (requiresConfirmModal) {
      setPendingCustomAction(customAction);
      setShowConfirmModal(true);
    } else {
      executeSubmit(customAction);
    }
  }

  async function executeSubmit(customAction?: "approve" | "rework") {
    setPending(true);
    setError(null);

    const actionToUse = customAction ?? pendingCustomAction;
    const fd = new FormData();

    if (isEditMode) {
      fd.append("is_edit", "true");
      fd.append("target_stage", status);

      if (status === "isbn_registration") {
        fd.append("isbn", isbn);
        fd.append("application_ref", applicationRef);
      } else if (status === "printing") {
        fd.append("print_copies", String(printQuantity));
      } else if (status === "final_proof") {
        fd.append("proof_feedback", proofFeedbackText);
      } else if ((status === "dtp" || status === "editing") && file) {
        fd.append("layout_file", file);
      } else if (status === "cover_design" && file) {
        fd.append("cover_file", file);
      }
    } else {
      if (status === "isbn_registration") {
        if (isIsbnStep1) {
          fd.append("step", "request_sent");
          fd.append("application_ref", applicationRef);
        } else {
          fd.append("step", "number_allocated");
          fd.append("isbn", isbn);
        }
      } else if (status === "printing") {
        fd.append("print_copies", String(printQuantity));
      } else if (status === "final_proof") {
        fd.append("action", actionToUse || "approve");
        if (actionToUse === "rework") {
          fd.append("rework_notes", reworkNotes);
        }
      } else if ((status === "dtp" || status === "editing") && file) {
        fd.append("layout_file", file);
      } else if (status === "cover_design" && file) {
        fd.append("cover_file", file);
      }
    }

    try {
      const res = await fetch(`/api/production/${projectId}/advance`, {
        method: "POST",
        body: fd,
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to save stage changes");
        setShowConfirmModal(false);
      } else {
        setShowConfirmModal(false);
        setFile(null);
        router.refresh();

        let nextStage = status;
        if (!isEditMode) {
          if (status === "dtp") nextStage = "editing";
          else if (status === "editing") nextStage = "cover_design";
          else if (status === "cover_design") nextStage = "isbn_registration";
          else if (status === "isbn_registration") {
            if (isIsbnStep1) nextStage = "isbn_registration";
            else nextStage = "printing";
          } else if (status === "printing") {
            nextStage = "final_proof";
          } else if (status === "final_proof") {
            if (actionToUse === "rework") nextStage = "editing";
            else nextStage = "completed";
          }
        }

        if (onSuccess) onSuccess(nextStage);
      }
    } catch {
      setError("Failed to connect to server");
      setShowConfirmModal(false);
    } finally {
      setPending(false);
    }
  }

  const verb = STAGE_VERBS[status] || "Stage Details";

  const isFormValid = isEditMode
    ? status === "isbn_registration"
      ? isbn.trim().length >= 5 || applicationRef.trim().length > 0
      : status === "printing"
      ? printQuantity > 0
      : status === "final_proof"
      ? true
      : file !== null // In edit mode for files, user selects new file to replace
    : status === "isbn_registration"
    ? isIsbnStep1
      ? true
      : isbn.trim().length >= 5
    : status === "printing"
    ? printQuantity > 0
    : status === "final_proof"
    ? Boolean(proofApprovedAt || authorConsentVerified)
    : status === "dtp"
    ? file !== null || Boolean(hasLayout)
    : status === "cover_design"
    ? file !== null
    : true;

  return (
    <form
      onSubmit={(e) => handleFormSubmit(e)}
      className={`rounded-2xl border p-5 space-y-4 animate-apple-in ${
        isEditMode
          ? "border-primary/30 bg-primary/[0.03] shadow-plum-sm"
          : "border-warning/20 bg-warning/5"
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3
              className={`text-sm font-bold ${
                isEditMode ? "text-primary" : "text-warning"
              }`}
            >
              {isEditMode ? `Edit Stage Data: ${verb}` : `Your Active Task: ${verb}`}
            </h3>
            {isEditMode && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary border border-primary/20">
                Edit Mode
              </span>
            )}
          </div>

          {!isEditMode && status === "isbn_registration" && (
            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-bold text-warning border border-warning/20">
              {isIsbnStep1 ? "Step 1 of 2: Application Sent" : "Step 2 of 2: ISBN Allocation"}
            </span>
          )}
          {!isEditMode && status === "final_proof" && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                proofApprovedAt
                  ? "bg-success/15 text-success border-success/25"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
              }`}
            >
              {proofApprovedAt ? "✓ Author Signed Off" : "Awaiting Author Sign-Off"}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isEditMode
            ? "Update previous deliverables, replace files, or revise metadata without re-routing project sequence."
            : status === "isbn_registration"
            ? isIsbnStep1
              ? "Submit application reference after applying to Raja Rammohun Roy National Agency."
              : "Enter the allocated 13-digit ISBN number to advance project to Author Final Proof."
            : status === "final_proof"
            ? "Verify author review sign-off to finish production and publish the book to the catalog."
            : `Upload required deliverables and complete this milestone to advance production.`}
        </p>
      </div>

      {/* DTP Layout Upload */}
      {status === "dtp" && (
        <FileUploadBox
          id="dtp_layout"
          file={file}
          onFileSelect={setFile}
          onFileRemove={() => setFile(null)}
          accept=".pdf,.doc,.docx"
          required={!isEditMode && !hasLayout}
          label="Typeset Proofreading Layout PDF"
          description="Upload finalized formatted typesetting PDF for editorial review."
          hint="PDF, DOC, DOCX up to 50MB"
          iconType="document"
        />
      )}

      {/* Editing Proofreading Deliverable */}
      {status === "editing" && (
        <FileUploadBox
          id="editing_layout"
          file={file}
          onFileSelect={setFile}
          onFileRemove={() => setFile(null)}
          accept=".pdf,.doc,.docx"
          required={false}
          label="Revised Typeset PDF (Optional)"
          description="If text corrections were made during proofreading, upload updated PDF."
          hint="PDF, DOC, DOCX up to 50MB"
          iconType="document"
        />
      )}

      {/* Cover Design Artwork Upload */}
      {status === "cover_design" && (
        <FileUploadBox
          id="cover_file"
          file={file}
          onFileSelect={setFile}
          onFileRemove={() => setFile(null)}
          accept="image/*,.pdf"
          required={!isEditMode}
          label="Book Cover Artwork Deliverable"
          description="Upload print-ready book jacket front/back cover design."
          hint="PNG, JPG, WEBP, or PDF up to 50MB"
          iconType="image"
        />
      )}

      {/* ISBN Registration Stage */}
      {status === "isbn_registration" && (
        <div className="space-y-4">
          {isEditMode ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="isbnInput" className="block text-xs font-semibold   tracking-wider text-muted-foreground">
                  13-Digit ISBN Number
                </label>
                <input
                  id="isbnInput"
                  type="text"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="978-81-..."
                  className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm font-mono text-foreground focus:ring-2 focus:ring-[#7e2562]/20 dark:border-white/15"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="appRefInput" className="block text-xs font-semibold   tracking-wider text-muted-foreground">
                  Agency Application Reference #
                </label>
                <input
                  id="appRefInput"
                  type="text"
                  value={applicationRef}
                  onChange={(e) => setApplicationRef(e.target.value)}
                  placeholder="e.g. RRRNA/2026/0918"
                  className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm font-mono text-foreground focus:ring-2 focus:ring-[#7e2562]/20 dark:border-white/15"
                />
              </div>
            </div>
          ) : isIsbnStep1 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-foreground space-y-1">
                <p className="font-bold">Step 1: Agency Application Filing</p>
                <p className="text-muted-foreground leading-relaxed">
                  Log the application reference number received from Raja Rammohun Roy National Agency after applying online.
                </p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="appRefInput" className="block text-xs font-semibold   tracking-wider text-muted-foreground">
                  Agency Application Reference # (Optional)
                </label>
                <input
                  id="appRefInput"
                  type="text"
                  value={applicationRef}
                  onChange={(e) => setApplicationRef(e.target.value)}
                  placeholder="e.g. RRRNA/2026/0918 or Acknowledgement Number"
                  className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm font-mono text-foreground focus:ring-2 focus:ring-[#7e2562]/20 dark:border-white/15"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-primary">Step 2: ISBN Allocation &amp; Record</p>
                  {isbnRequestRef && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Ref: {isbnRequestRef}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Enter the assigned 13-digit ISBN received from the agency.
                </p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="isbnInput" className="block text-xs font-semibold   tracking-wider text-muted-foreground">
                  Allocated 13-Digit ISBN <span className="text-danger">*</span>
                </label>
                <input
                  id="isbnInput"
                  type="text"
                  required
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="978-81-..."
                  className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm font-mono text-foreground focus:ring-2 focus:ring-[#7e2562]/20 dark:border-white/15"
                />
                <p className="text-[11px] text-muted-foreground">
                  Saving the allocated ISBN will advance the pipeline to Author Final Proof and automatically email the author with the proofreading PDF attached.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Press Printing & Stock Allocation Stage */}
      {status === "printing" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* 1. Author Free Copies (Fixed from Contract - Non Editable) */}
            <div className="space-y-1.5 rounded-xl border border-black/10 bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-foreground">
                  Author Complimentary Copies
                </label>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#faedf5] px-2.5 py-0.5 text-[10px] font-bold text-[#7e2562] border border-[#7e2562]/20">
                  <Lock className="h-3 w-3 text-[#7e2562]" /> Fixed in Contract
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  readOnly
                  disabled
                  value={authorCopies}
                  className="w-full rounded-xl border border-black/10 bg-slate-100 px-3.5 py-2 text-sm font-extrabold text-foreground opacity-80 cursor-not-allowed dark:bg-white/10"
                />
                <span className="text-xs font-bold text-muted-foreground shrink-0">Copies</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Fixed complimentary copy quantity specified in the signed contract agreement.
              </p>
            </div>

            {/* 2. Total Print Run Quantity */}
            <div className="space-y-1.5 rounded-xl border border-[#7e2562]/20 bg-[#faedf5]/30 p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="printQuantityInput" className="block text-xs font-extrabold text-foreground">
                  Total Print Run Quantity <span className="text-rose-600">*</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="printQuantityInput"
                  type="number"
                  required
                  min={authorCopies || 1}
                  value={printQuantity}
                  onChange={(e) => setPrintQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-xl border border-black/15 bg-white px-3.5 py-2 text-sm font-extrabold text-foreground focus:ring-2 focus:ring-[#7e2562]/20"
                />
                <span className="text-xs font-bold text-muted-foreground shrink-0">Copies</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Total physical copies to print in press run (includes author copies &amp; retail stock).
              </p>
            </div>
          </div>

          {/* Simple Stock Breakdown Summary */}
          <div className="rounded-xl border border-black/10 bg-surface p-4 text-xs space-y-2 dark:border-white/10">
            <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Press Print Run Allocation Summary
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-black/[0.03] p-2 dark:bg-white/[0.04]">
                <span className="text-[10px] text-muted-foreground block">Total Print Run</span>
                <strong className="text-foreground text-sm font-black">{printQuantity} Copies</strong>
              </div>
              <div className="rounded-lg bg-[#faedf5] p-2 border border-[#7e2562]/20">
                <span className="text-[10px] text-[#7e2562] block font-bold">Author Copies (Fixed)</span>
                <strong className="text-[#7e2562] text-sm font-black">{authorCopies} Copies</strong>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-300">
                <span className="text-[10px] text-emerald-800 block font-bold">Retail &amp; Catalog Stock</span>
                <strong className="text-emerald-900 text-sm font-black">{Math.max(0, printQuantity - authorCopies)} Copies</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Author Final Proof Stage */}
      {status === "final_proof" && (
        <div className="space-y-3">
          {isEditMode ? (
            <div className="space-y-1.5">
              <label htmlFor="proofFeedback" className="block text-xs font-semibold   tracking-wider text-muted-foreground">
                Author Proof Feedback &amp; Approval Notes
              </label>
              <textarea
                id="proofFeedback"
                rows={3}
                value={proofFeedbackText}
                onChange={(e) => setProofFeedbackText(e.target.value)}
                placeholder="Author proof sign-off remarks, approval status, or corrections recorded..."
                className="w-full rounded-xl border border-black/15 bg-surface px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-[#7e2562]/20 dark:border-white/15"
              />
            </div>
          ) : proofApprovedAt ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-3.5 text-xs font-semibold text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <div>
                <p className="font-bold">Author Digital Sign-Off Confirmed ({proofApprovedAt.split(" ")[0]})</p>
                <p className="text-[11px] opacity-80">The author has reviewed and approved the proof deliverables. Ready to finish and publish the book.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Author Digital Sign-Off Pending</span>
                </div>
              </div>
              {proofEmailSentAt && (
                <p className="text-[10px] text-muted-foreground">
                  Proof email last sent to author: {proofEmailSentAt}
                </p>
              )}
              {emailStatus && (
                <p className="text-xs font-semibold text-success animate-in fade-in">{emailStatus}</p>
              )}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                The author received an email with the proofreading PDF attached and a 1-click digital approval link. If verbal/written consent was received offline, you may check below:
              </p>
              <label className="flex items-start gap-2.5 pt-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorConsentVerified}
                  onChange={(e) => setAuthorConsentVerified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-black/20 text-[#7e2562] accent-[#7e2562] focus:ring-[#7e2562] cursor-pointer"
                />
                <span className="text-xs text-foreground font-medium leading-tight">
                  I confirm that the author has reviewed the proof deliverables and provided formal sign-off (written/verbal) to finish and publish the book.
                </span>
              </label>
            </div>
          )}

          {!isEditMode && (showRework ? (
            <div className="space-y-2 rounded-xl border border-warning/30 bg-warning/5 p-4 animate-in fade-in">
              <label htmlFor="reworkNotes" className="block text-xs font-semibold   tracking-wider text-warning">
                Revision Notes &amp; Required Changes
              </label>
              <textarea
                id="reworkNotes"
                rows={3}
                value={reworkNotes}
                onChange={(e) => setReworkNotes(e.target.value)}
                placeholder="Specify what corrections or re-typesetting is needed..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={pending || !reworkNotes.trim()}
                  onClick={(e) => handleFormSubmit(e, "rework")}
                  className="rounded-lg bg-warning px-4 py-1.5 text-xs font-bold text-white hover:bg-warning/90 transition disabled:opacity-60 cursor-pointer"
                >
                  Confirm Send for Rework
                </button>
                <button
                  type="button"
                  onClick={() => setShowRework(false)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRework(true)}
                className="text-xs text-muted-foreground underline hover:text-foreground transition cursor-pointer"
              >
                <span className="inline-flex items-center gap-1">Author requested revisions? Click here to send for rework <ArrowRight size={11} /></span>
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

      {!showRework && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending || !isFormValid}
            className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2 ${
              isEditMode
                ? "bg-[#7e2562] text-white hover:bg-[#681d50] shadow-plum-sm"
                : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-plum-sm"
            }`}
          >
            {pending
              ? "Saving changes..."
              : isEditMode
              ? "✓ Save & Update Deliverables"
              : status === "isbn_registration"
              ? isIsbnStep1
                ? <span className="inline-flex items-center gap-1.5">Mark ISBN Request Sent to Agency <ArrowRight /></span>
                : <span className="inline-flex items-center gap-1.5">Confirm Allocation &amp; Dispatch Proof Email to Author <ArrowRight /></span>
              : status === "final_proof"
              ? (proofApprovedAt ? <span className="inline-flex items-center gap-1.5">✓ Finish &amp; Publish Book <ArrowRight /></span> : <span className="inline-flex items-center gap-1.5">✓ Complete &amp; Publish Book <ArrowRight /></span>)
              : `Complete ${verb}`}
          </button>

          {isEditMode && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-surface-muted hover:text-foreground transition cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <StageConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => executeSubmit()}
        pending={pending}
        title={
          pendingCustomAction === "rework"
            ? "Send for Revisions & Rework?"
            : status === "final_proof"
            ? "Finish Production & Publish Book?"
            : "Are you sure you want to move to the next step?"
        }
        subtitle={
          pendingCustomAction === "rework"
            ? "The manuscript layout will be returned to typesetting with revision feedback."
            : status === "final_proof"
            ? "This will finalize all production stages and make the book active in the Published Books Catalog."
            : "Please verify the milestone deliverables before advancing the production pipeline."
        }
        currentStage={
          pendingCustomAction === "rework"
            ? "Author Final Proof"
            : isIsbnStep1
            ? "ISBN Agency Filing"
            : STAGE_TRANSITIONS[status]?.current || verb
        }
        nextStage={
          pendingCustomAction === "rework"
            ? "Typesetting & Layout Rework"
            : isIsbnStep1
            ? "ISBN Allocation Confirmation"
            : STAGE_TRANSITIONS[status]?.next || "Next Pipeline Milestone"
        }
        description={
          pendingCustomAction === "rework"
            ? `Author revisions requested: "${reworkNotes}". The layout team will be tasked to apply corrections.`
            : isIsbnStep1
            ? "Marking application as officially filed with Raja Rammohun Roy National Agency."
            : STAGE_TRANSITIONS[status]?.description || "Completing this task will advance the production pipeline."
        }
        file={file ? { name: file.name, size: file.size } : null}
        metadata={[
          ...(isbn ? [{ label: "Allocated ISBN", value: isbn, isMono: true, isHighlight: true }] : []),
          ...(applicationRef ? [{ label: "Agency Application Ref", value: applicationRef, isMono: true }] : []),
          ...(pendingCustomAction === "rework" && reworkNotes
            ? [{ label: "Rework Feedback", value: reworkNotes, isNegative: true }]
            : []),
        ]}
        confirmText={
          pendingCustomAction === "rework"
            ? "Yes, Send for Rework"
            : status === "final_proof"
            ? "Yes, Finish & Publish Book"
            : <span className="inline-flex items-center gap-1.5">Yes, Move to Next Step <ArrowRight /></span>
        }
        confirmVariant={pendingCustomAction === "rework" ? "warning" : "primary"}
        iconType={pendingCustomAction === "rework" ? "rework" : "arrow"}
      />
    </form>
  );
}
