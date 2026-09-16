"use client";

import React from "react";
import Link from "next/link";
import { formatIST } from "@/lib/time";
import {
  FileText,
  Download,
  Image as ImageIcon,
  History,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
} from "lucide-react";

export type SubmissionFileRecord = {
  id: string;
  version: number;
  file_type: string; // "manuscript" | "cover"
  filename: string;
  file_size?: number | null;
  file_mime?: string | null;
  brief?: string | null;
  created_at: string;
};

interface Props {
  submissionId: string;
  files?: SubmissionFileRecord[];
  fallbackManuscript?: {
    filename?: string | null;
    size?: number | null;
    submittedAt?: string | null;
  } | null;
  fallbackCover?: {
    filename?: string | null;
    size?: number | null;
    submittedAt?: string | null;
  } | null;
  className?: string;
  showTitle?: boolean;
}

export function ManuscriptVersionHistory({
  submissionId,
  files = [],
  fallbackManuscript,
  fallbackCover,
  className = "",
  showTitle = true,
}: Props) {
  // If no files in DB yet, synthesize Version 1 from fallback if available
  let versionMap: Record<
    number,
    {
      version: number;
      createdAt: string;
      brief?: string | null;
      manuscript?: SubmissionFileRecord;
      cover?: SubmissionFileRecord;
    }
  > = {};

  if (files && files.length > 0) {
    files.forEach((f) => {
      if (!versionMap[f.version]) {
        versionMap[f.version] = {
          version: f.version,
          createdAt: f.created_at,
          brief: f.brief,
        };
      }
      if (f.file_type === "manuscript") {
        versionMap[f.version].manuscript = f;
      } else if (f.file_type === "cover") {
        versionMap[f.version].cover = f;
      }
      if (f.brief && !versionMap[f.version].brief) {
        versionMap[f.version].brief = f.brief;
      }
    });
  } else if (fallbackManuscript?.filename || fallbackCover?.filename) {
    versionMap[1] = {
      version: 1,
      createdAt: fallbackManuscript?.submittedAt || new Date().toISOString(),
      brief: "Initial manuscript submission",
      manuscript: fallbackManuscript?.filename
        ? {
            id: "initial-manuscript",
            version: 1,
            file_type: "manuscript",
            filename: fallbackManuscript.filename,
            file_size: fallbackManuscript.size,
            brief: "Initial submission",
            created_at: fallbackManuscript.submittedAt || new Date().toISOString(),
          }
        : undefined,
      cover: fallbackCover?.filename
        ? {
            id: "initial-cover",
            version: 1,
            file_type: "cover",
            filename: fallbackCover.filename,
            file_size: fallbackCover.size,
            brief: "Initial cover design",
            created_at: fallbackCover.submittedAt || new Date().toISOString(),
          }
        : undefined,
    };
  }

  const versionsList = Object.values(versionMap).sort((a, b) => b.version - a.version);
  const maxVersion = versionsList.length > 0 ? versionsList[0].version : 1;

  if (versionsList.length === 0) {
    return (
      <div className={`rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center text-xs text-muted-foreground ${className}`}>
        No manuscript files recorded yet.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between pb-2 border-b border-black/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#7e2562]/10 text-[#7e2562] flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Manuscript &amp; File Version History
              </h3>
              <p className="text-[11px] text-muted-foreground">
                All uploaded revisions and covers are securely preserved and downloadable below
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#7e2562] bg-[#faedf5] px-2.5 py-0.5 rounded-full border border-[#7e2562]/20">
            {versionsList.length} Version{versionsList.length !== 1 ? "s" : ""} Available
          </span>
        </div>
      )}

      {/* Version timeline items */}
      <div className="space-y-3">
        {versionsList.map((verItem, idx) => {
          const isLatest = verItem.version === maxVersion;
          const isInitial = verItem.version === 1;

          return (
            <div
              key={verItem.version}
              className={`relative rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                isLatest
                  ? "border-[#7e2562]/30 bg-gradient-to-b from-[#FAF5F8] to-white ring-1 ring-[#7e2562]/10"
                  : "border-neutral-200/90 bg-white hover:border-neutral-300"
              }`}
            >
              {/* Version Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide border ${
                      isLatest
                        ? "bg-[#7e2562] text-white border-[#7e2562]"
                        : "bg-neutral-100 text-neutral-800 border-neutral-300"
                    }`}
                  >
                    v{verItem.version}
                  </span>

                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    {isInitial ? "Initial Manuscript Submission" : `Revision ${verItem.version - 1} Upload`}
                  </span>

                  {isLatest && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Active / Latest
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{formatIST(verItem.createdAt)}</span>
                </div>
              </div>

              {/* Author Revision Brief (if provided) */}
              {verItem.brief && verItem.brief !== "Initial manuscript submission" && (
                <div className="mb-3 rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-amber-950">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                    <span>Author&apos;s Revision Brief:</span>
                  </div>
                  <p className="whitespace-pre-wrap pl-5 text-neutral-800 leading-relaxed font-normal">
                    &ldquo;{verItem.brief}&rdquo;
                  </p>
                </div>
              )}

              {/* Files in this version */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                {/* Manuscript Download */}
                {verItem.manuscript ? (
                  <a
                    href={`/api/submissions/${submissionId}/download?version=${verItem.version}&file=manuscript`}
                    download
                    className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#7e2562]/25 hover:border-[#7e2562] px-3.5 py-2 text-xs font-bold text-[#7e2562] shadow-xs hover:bg-[#faedf5]/40 transition-all hover:scale-[1.01]"
                  >
                    <FileText className="w-4 h-4 text-[#7e2562]" />
                    <span className="truncate max-w-[200px] sm:max-w-[260px]">
                      {verItem.manuscript.filename}
                    </span>
                    {verItem.manuscript.file_size && (
                      <span className="text-[10px] font-normal text-muted-foreground opacity-80">
                        ({(verItem.manuscript.file_size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    )}
                    <Download className="w-3.5 h-3.5 ml-1 opacity-70" />
                  </a>
                ) : (
                  <a
                    href={`/api/submissions/${submissionId}/download`}
                    download
                    className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#7e2562]/25 hover:border-[#7e2562] px-3.5 py-2 text-xs font-bold text-[#7e2562] shadow-xs hover:bg-[#faedf5]/40 transition-all"
                  >
                    <FileText className="w-4 h-4 text-[#7e2562]" />
                    <span>Download Manuscript</span>
                    <Download className="w-3.5 h-3.5 ml-1 opacity-70" />
                  </a>
                )}

                {/* Cover Download if uploaded for this version */}
                {verItem.cover && (
                  <a
                    href={`/api/submissions/${submissionId}/download?version=${verItem.version}&file=cover`}
                    download
                    className="inline-flex items-center gap-2 rounded-xl bg-white border border-emerald-300 hover:border-emerald-500 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-50/50 transition-all hover:scale-[1.01]"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span className="truncate max-w-[180px]">
                      {verItem.cover.filename}
                    </span>
                    {verItem.cover.file_size && (
                      <span className="text-[10px] font-normal text-muted-foreground opacity-80">
                        ({(verItem.cover.file_size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    )}
                    <Download className="w-3.5 h-3.5 ml-1 opacity-70" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
