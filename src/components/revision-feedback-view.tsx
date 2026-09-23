"use client";

import React from "react";
import { parseRevisionNotes, RevisionSeverity } from "@/lib/revision-feedback";
import {
  FileText,
  AlertTriangle,
  Sparkles,
  Info,
  BookOpen,
  Layers,
  MessageSquare,
} from "lucide-react";

interface Props {
  notes?: string | null;
  status?: string;
  className?: string;
}

const SEVERITY_CONFIG: Record<
  RevisionSeverity,
  { label: string; badgeClass: string; borderClass: string; icon: React.ReactNode }
> = {
  critical: {
    label: "Critical Revision Required",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    borderClass: "border-rose-200 bg-rose-50/40",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
  },
  major: {
    label: "Major Revision",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    borderClass: "border-amber-200 bg-amber-50/40",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
  },
  minor: {
    label: "Minor Polish",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-300",
    borderClass: "border-sky-200 bg-sky-50/40",
    icon: <Info className="w-3.5 h-3.5 text-sky-600" />,
  },
  suggestion: {
    label: "Editorial Suggestion",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    borderClass: "border-emerald-200 bg-emerald-50/40",
    icon: <Sparkles className="w-3.5 h-3.5 text-emerald-600" />,
  },
};

export function RevisionFeedbackView({ notes, status, className = "" }: Props) {
  if (!notes && status !== "declined") return null;

  const parsed = parseRevisionNotes(notes);

  if (status === "declined") {
    return (
      <div className={`rounded-2xl border border-rose-200 bg-rose-50/60 p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-rose-900">
            Manuscript Evaluation Note &amp; Decline Reason
          </h4>
        </div>
        {parsed.overallSummary ? (
          <div className="mt-3 text-xs sm:text-sm text-neutral-800 whitespace-pre-wrap bg-white/90 p-4 border border-rose-200/80 rounded-xl leading-relaxed shadow-xs">
            {parsed.overallSummary}
          </div>
        ) : (
          <p className="text-xs text-rose-800/90 leading-relaxed mt-1">
            The editorial board has completed review and regretfully decided not to proceed with publication at this time.
          </p>
        )}
      </div>
    );
  }

  const hasAuthorBriefs = parsed.authorBriefs && parsed.authorBriefs.length > 0;
  const hasEditorialContent = parsed.isSectionWise || Boolean(parsed.overallSummary && parsed.overallSummary.trim());

  if (!hasAuthorBriefs && !hasEditorialContent) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Author's Revision Briefs (if any) */}
      {hasAuthorBriefs && (
        <div className="space-y-3">
          {parsed.authorBriefs.map((ab, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-amber-300/60 bg-amber-50/70 p-4 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                    {ab.title || "Author's Revision Brief"}
                  </h4>
                </div>
                {ab.timestamp && (
                  <span className="text-[10px] text-amber-800 font-medium">
                    {ab.timestamp}
                  </span>
                )}
              </div>
              <div className="text-xs sm:text-sm text-neutral-800 whitespace-pre-wrap bg-white/90 p-3.5 border border-amber-200/80 rounded-xl leading-relaxed">
                {ab.brief}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Section-by-Section Editorial Feedback */}
      {parsed.isSectionWise && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#7e2562]/10 text-[#7e2562] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Section-by-Section Editorial Revisions
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {parsed.sections.length} section{parsed.sections.length !== 1 ? "s" : ""} requiring editorial revisions
                </p>
              </div>
            </div>
          </div>

          {/* Overall Summary if provided */}
          {parsed.overallSummary && parsed.overallSummary.trim() && (
            <div className="rounded-2xl border border-[#7e2562]/20 bg-[#faedf5]/40 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#7e2562] mb-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Overall Editorial Overview</span>
              </div>
              <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {parsed.overallSummary}
              </p>
            </div>
          )}

          {/* Sections List */}
          <div className="space-y-3">
            {parsed.sections.map((sec, idx) => {
              const config = SEVERITY_CONFIG[sec.severity] || SEVERITY_CONFIG.major;
              return (
                <div
                  key={sec.id || idx}
                  className={`rounded-2xl border p-4 transition-all shadow-xs ${config.borderClass}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-black/5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white text-neutral-800 font-extrabold text-[11px] flex items-center justify-center border border-black/10 shadow-xs">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        {sec.section}
                      </span>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${config.badgeClass}`}
                    >
                      {config.icon}
                      {config.label}
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed pl-7">
                    {sec.feedback}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Plain Text Editorial Feedback (if not section-wise) */}
      {!parsed.isSectionWise && parsed.overallSummary && parsed.overallSummary.trim() && (
        <div className="rounded-2xl border border-[#7e2562]/15 bg-[#faedf5]/30 p-4">
          <div className="flex items-center gap-2 font-bold text-[#7e2562] text-xs mb-2">
            <FileText className="w-4 h-4" />
            <span>Editorial Feedback &amp; Requested Changes:</span>
          </div>
          <div className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap bg-white/80 p-3.5 border border-[#7e2562]/10 rounded-xl leading-relaxed">
            {parsed.overallSummary}
          </div>
        </div>
      )}
    </div>
  );
}
