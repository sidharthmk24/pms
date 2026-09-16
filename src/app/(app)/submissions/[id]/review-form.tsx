"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SmoothDropdown } from "@/components/dropdown";
import {
  COMMON_BOOK_SECTIONS,
  RevisionSection,
  RevisionSeverity,
} from "@/lib/revision-feedback";
import {
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
  BookOpen,
  Layers,
  Send,
  MessageSquare,
  HelpCircle,
} from "lucide-react";

type ActionType = "decline" | "revision" | "accept";

const DECLINE_PRESETS = [
  "Our publishing catalogue and seasonal quota for this genre are currently full.",
  "The current manuscript does not closely align with our editorial scope and target readership.",
  "The manuscript shows promise but requires substantial creative reworking and development before publication.",
  "We are currently prioritizing previously contracted publishing agreements.",
];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical Action" },
  { value: "major", label: "Major Revision" },
  { value: "minor", label: "Minor Polish" },
  { value: "suggestion", label: "Editorial Suggestion" },
];

export default function ReviewForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [action, setAction] = useState<ActionType | null>(null);

  // Decline fields
  const [declineMessage, setDeclineMessage] = useState("");

  // Revision fields (Section-by-section)
  const [overallSummary, setOverallSummary] = useState("");
  const [sections, setSections] = useState<RevisionSection[]>([
    {
      id: "sec-1",
      section: "Introduction, Foreword & Preface / ആമുഖം & അവതാരിക",
      severity: "major",
      feedback: "",
    },
  ]);

  // Accept fields
  const [publishingType, setPublishingType] = useState<"kairali_funded" | "self_publishing">("kairali_funded");
  const [royaltyPct, setRoyaltyPct] = useState(10);
  const [basis, setBasis] = useState<"mrp" | "net">("mrp");
  const [advanceRupees, setAdvanceRupees] = useState(0);
  const [termYears, setTermYears] = useState(3);
  const [freeCopies, setFreeCopies] = useState(10);
  const [authorDiscountPct, setAuthorDiscountPct] = useState(40);
  const [packageCostRupees, setPackageCostRupees] = useState(35000);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to add section
  function handleAddSection(sectionName?: string, defaultSeverity?: RevisionSeverity) {
    const newId = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setSections((prev) => [
      ...prev,
      {
        id: newId,
        section: sectionName || "Specific Chapters / നിർദ്ദിഷ്ട അധ്യായങ്ങൾ",
        severity: defaultSeverity || "major",
        feedback: "",
      },
    ]);
  }

  function handleRemoveSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function handleSectionChange(id: string, field: "section" | "severity" | "feedback", value: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action) return;

    setPending(true);
    setError(null);

    const payload: Record<string, unknown> = { action };

    if (action === "decline") {
      payload.declineMessage = declineMessage.trim();
    } else if (action === "revision") {
      // Validate that either overallSummary or at least one section has feedback
      const validSections = sections.filter((s) => s.feedback.trim().length > 0);
      if (!overallSummary.trim() && validSections.length === 0) {
        setError("Please enter an overall summary or provide feedback for at least one section.");
        setPending(false);
        return;
      }
      payload.overallSummary = overallSummary.trim();
      payload.sections = validSections.length > 0 ? validSections : undefined;
      payload.feedback = overallSummary.trim() || validSections.map(s => `${s.section}: ${s.feedback}`).join("\n");
    } else if (action === "accept") {
      payload.publishingType = publishingType;
      payload.royaltyPct = Number(royaltyPct);
      payload.basis = basis;
      payload.advanceRupees = Number(advanceRupees);
      payload.termYears = Number(termYears);
      payload.freeCopies = Number(freeCopies);
      payload.authorDiscountPct = Number(authorDiscountPct);
      payload.packageCostRupees = publishingType === "self_publishing" ? Number(packageCostRupees) : 0;
    }

    try {
      const res = await fetch(`/api/submissions/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error ?? "Failed to save review decision");
      } else {
        router.refresh();
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setPending(false);
    }
  }

  const gstAmount = publishingType === "self_publishing" ? Math.round(packageCostRupees * 0.18) : 0;
  const totalPackageWithGst = packageCostRupees + gstAmount;

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-[#7e2562]/12 bg-white p-6 shadow-plum-sm">
      <h2 className="mb-4 text-base font-bold text-foreground">Review &amp; Publishing Decision</h2>
      
      {/* 3 Action Buttons */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => { setAction("accept"); setError(null); }}
          className={`apple-button flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
            action === "accept"
              ? "border-emerald-600 bg-emerald-600 text-white shadow-xs font-bold ring-2 ring-emerald-600/20"
              : "border-black/10 bg-black/[0.02] text-foreground hover:bg-black/[0.05]"
          }`}
        >
          <span className="text-sm font-extrabold">Accept &amp; Contract</span>
          <span className="mt-0.5 text-[11px] opacity-80">Generate legal agreement</span>
        </button>

        <button
          type="button"
          onClick={() => { setAction("revision"); setError(null); }}
          className={`apple-button flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
            action === "revision"
              ? "border-amber-500 bg-amber-500 text-white shadow-xs font-bold ring-2 ring-amber-500/20"
              : "border-black/10 bg-black/[0.02] text-foreground hover:bg-black/[0.05]"
          }`}
        >
          <span className="text-sm font-extrabold">Request Revision</span>
          <span className="mt-0.5 text-[11px] opacity-80">Section-by-section directives</span>
        </button>

        <button
          type="button"
          onClick={() => { setAction("decline"); setError(null); }}
          className={`apple-button flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
            action === "decline"
              ? "border-rose-600 bg-rose-600 text-white shadow-xs font-bold ring-2 ring-rose-600/20"
              : "border-black/10 bg-black/[0.02] text-foreground hover:bg-black/[0.05]"
          }`}
        >
          <span className="text-sm font-extrabold">Decline</span>
          <span className="mt-0.5 text-[11px] opacity-80">Reject &amp; send message</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. DECLINE FORM WITH MESSAGE INPUT                      */}
      {/* ======================================================== */}
      {action === "decline" && (
        <div className="mb-6 space-y-4 rounded-2xl border border-rose-200 bg-rose-50/50 p-5 animate-in fade-in-50 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-rose-950">
                Decline Manuscript &amp; Send Message to Author
              </h3>
              <p className="text-xs text-rose-800/80 mt-0.5 leading-relaxed">
                Declining will update the status to <strong>Declined</strong> and send an official email and author portal notification. You can provide an explanation or encouraging remarks below.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="declineMessage" className="block text-xs font-bold tracking-wider text-rose-950 mb-1.5">
              Message / Reason for Author <span className="text-neutral-500 font-normal">(Optional but recommended)</span>
            </label>
            <textarea
              id="declineMessage"
              rows={4}
              value={declineMessage}
              onChange={(e) => setDeclineMessage(e.target.value)}
              placeholder="State constructive reasons for the decline, or provide encouraging words for the author's future work..."
              className="w-full rounded-xl border border-rose-300/80 bg-white px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/10 shadow-xs"
            />
          </div>

          {/* Quick preset chips */}
          <div>
            <span className="block text-[11px] font-bold text-rose-900 mb-1.5">
              Quick Preset Reasons (Click to populate):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DECLINE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDeclineMessage(preset)}
                  className="rounded-lg border border-rose-200 bg-white hover:bg-rose-100/60 px-2.5 py-1 text-[11px] font-medium text-rose-900 transition-colors text-left cursor-pointer"
                >
                  &ldquo;{preset.slice(0, 48)}...&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. REVISION FORM: SECTION-BY-SECTION DIRECTIVES         */}
      {/* ======================================================== */}
      {action === "revision" && (
        <div className="mb-6 space-y-5 rounded-2xl border border-amber-200 bg-amber-50/30 p-5 sm:p-6 animate-in fade-in-50 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-950">
                Section-by-Section Editorial Revision Directives
              </h3>
              <p className="text-xs text-amber-800/80 mt-0.5 leading-relaxed">
                Break down required changes by specific manuscript section (e.g. Title, Introduction, Chapters, Language &amp; Grammar, Cover Design) so the author knows exactly what to revise.
              </p>
            </div>
          </div>

          {/* Overall Summary */}
          <div>
            <label htmlFor="overallSummary" className="block text-xs font-bold tracking-wider text-neutral-700 mb-1.5">
              Overall Editorial Summary / Comments <span className="text-neutral-400 font-normal">(Optional overview)</span>
            </label>
            <textarea
              id="overallSummary"
              rows={2}
              value={overallSummary}
              onChange={(e) => setOverallSummary(e.target.value)}
              placeholder="General remarks about the strengths, potential, and overall scope of the requested revisions..."
              className="w-full rounded-xl border border-black/12 bg-white px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 shadow-xs"
            />
          </div>

          {/* Quick-add preset section buttons */}
          <div>
            <span className="block text-xs font-bold text-neutral-700 mb-2">
              Quick Add Common Book Sections:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_BOOK_SECTIONS.map((sec, idx) => {
                const alreadyAdded = sections.some((s) => s.section === sec.value);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => handleAddSection(sec.value, sec.defaultSeverity)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      alreadyAdded
                        ? "bg-neutral-200/70 text-neutral-400 cursor-not-allowed"
                        : "bg-white border border-amber-300/80 text-amber-950 hover:bg-amber-100 hover:border-amber-400 shadow-xs cursor-pointer"
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    {sec.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Section Cards */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                Sections Requiring Revision ({sections.length})
              </label>
              <button
                type="button"
                onClick={() => handleAddSection()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7e2562] hover:text-[#681e51] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Section
              </button>
            </div>

            {sections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-xs text-neutral-500">
                No sections added yet. Click one of the quick buttons above or &quot;Add Custom Section&quot; to specify section revisions.
              </div>
            ) : (
              sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Section title / name input or selector */}
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={sec.section}
                        onChange={(e) => handleSectionChange(sec.id, "section", e.target.value)}
                        placeholder="e.g. Chapter 3, Introduction, Plot Flow, etc."
                        className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 text-xs sm:text-sm font-bold text-foreground outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                      />
                    </div>

                    <div className="flex items-center gap-2 pl-8 sm:pl-0">
                      {/* Severity dropdown using project SmoothDropdown */}
                      <div className="w-44 shrink-0">
                        <SmoothDropdown
                          size="sm"
                          value={sec.severity}
                          onChange={(val) => handleSectionChange(sec.id, "severity", val as RevisionSeverity)}
                          options={SEVERITY_OPTIONS}
                        />
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(sec.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Feedback textarea for this specific section */}
                  <textarea
                    rows={3}
                    value={sec.feedback}
                    onChange={(e) => handleSectionChange(sec.id, "feedback", e.target.value)}
                    required
                    placeholder={`Specify detailed revision instructions for ${sec.section}...`}
                    className="w-full rounded-xl border border-neutral-200 bg-[#FAF5F8]/30 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ACCEPT FORM WITH CONTRACT TERMS                      */}
      {/* ======================================================== */}
      {action === "accept" && (
        <div className="mb-6 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 animate-in fade-in-50 duration-200">
          <div className="rounded-xl bg-emerald-100/70 p-3.5 border border-emerald-300/80 text-xs font-semibold text-emerald-950">
            Accepting creates the Author &amp; Catalog records, auto-generates the legal agreement, and triggers the digital signing flow.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="publishingType" className="mb-1.5 block text-xs font-bold text-foreground">
                Publishing Model Track
              </label>
              <SmoothDropdown
                id="publishingType"
                value={publishingType}
                onChange={(val) => setPublishingType(val as any)}
                options={[
                  { value: "kairali_funded", label: "Kairali Books Publishing" },
                  { value: "self_publishing", label: "Self-Publishing (Author-Funded)" },
                ]}
              />
            </div>

            <div>
              <label htmlFor="basis" className="mb-1.5 block text-xs font-bold text-foreground">
                Royalty Calculation Basis
              </label>
              <SmoothDropdown
                id="basis"
                value={basis}
                onChange={(val) => setBasis(val as any)}
                options={[
                  { value: "mrp", label: "Printed MRP Basis" },
                  { value: "net", label: "Net Realized Receipts Basis" },
                ]}
              />
            </div>

            <div>
              <label htmlFor="royaltyPct" className="mb-1.5 block text-xs font-bold text-foreground">
                Royalty Rate (%)
              </label>
              <input
                id="royaltyPct"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={royaltyPct}
                onChange={(e) => setRoyaltyPct(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-black/12 bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="advanceRupees" className="mb-1.5 block text-xs font-bold text-foreground">
                Advance on Royalty (₹)
              </label>
              <input
                id="advanceRupees"
                type="number"
                min="0"
                step="500"
                value={advanceRupees}
                onChange={(e) => setAdvanceRupees(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-black/12 bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="freeCopies" className="mb-1.5 block text-xs font-bold text-foreground">
                Author Free Copies
              </label>
              <input
                id="freeCopies"
                type="number"
                min="0"
                max="100"
                value={freeCopies}
                onChange={(e) => setFreeCopies(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-black/12 bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="authorDiscountPct" className="mb-1.5 block text-xs font-bold text-foreground">
                Author Purchase Discount (%)
              </label>
              <input
                id="authorDiscountPct"
                type="number"
                min="0"
                max="100"
                value={authorDiscountPct}
                onChange={(e) => setAuthorDiscountPct(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-black/12 bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="termYears" className="mb-1.5 block text-xs font-bold text-foreground">
                Contract Term (Years)
              </label>
              <SmoothDropdown
                id="termYears"
                value={termYears}
                onChange={(val) => setTermYears(Number(val))}
                options={[
                  { value: 3, label: "3 Years (Standard)" },
                  { value: 5, label: "5 Years" },
                  { value: 10, label: "10 Years" },
                ]}
              />
            </div>

            {publishingType === "self_publishing" && (
              <div>
                <label htmlFor="packageCostRupees" className="mb-1.5 block text-xs font-bold text-foreground">
                  Package Service Fee (₹ Excl. GST)
                </label>
                <input
                  id="packageCostRupees"
                  type="number"
                  min="0"
                  step="1000"
                  value={packageCostRupees}
                  onChange={(e) => setPackageCostRupees(Number(e.target.value))}
                  required
                  className="w-full rounded-xl border border-black/12 bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition-all"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  +18% GST (₹{gstAmount.toLocaleString("en-IN")}) = <strong className="text-foreground">₹{totalPackageWithGst.toLocaleString("en-IN")} Total</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-800" role="alert">
          {error}
        </p>
      )}

      {action && (
        <button
          type="submit"
          disabled={pending}
          className="apple-button flex items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-2.5 text-xs font-bold text-background shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {pending ? (
            <>
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Processing Decision...</span>
            </>
          ) : (
            <span>Confirm &amp; Submit Decision</span>
          )}
        </button>
      )}
    </form>
  );
}
