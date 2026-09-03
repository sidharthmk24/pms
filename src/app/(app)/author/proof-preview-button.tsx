"use client";

import { useState } from "react";
import { DocumentPreviewModal } from "@/components/document-preview-modal";

export function ProofPreviewButtons({
  projectId,
  title,
  hasLayout,
  hasCover,
}: {
  projectId: string;
  title: string;
  hasLayout: boolean;
  hasCover: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeType, setActiveType] = useState<"layout" | "cover">("layout");

  return (
    <>
      <div className="flex flex-wrap gap-2.5 pt-1">
        {hasLayout ? (
          <button
            type="button"
            onClick={() => {
              setActiveType("layout");
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition shadow-2xs cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>View Typeset Layout (PDF)</span>
          </button>
        ) : (
          <span className="rounded-xl border border-black/5 bg-black/[0.02] px-3 py-2 text-xs text-muted-foreground italic dark:border-white/5">
            Typeset interior PDF in preparation...
          </span>
        )}

        {hasCover ? (
          <button
            type="button"
            onClick={() => {
              setActiveType("cover");
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition shadow-2xs cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>View Full Cover Artwork</span>
          </button>
        ) : (
          <span className="rounded-xl border border-black/5 bg-black/[0.02] px-3 py-2 text-xs text-muted-foreground italic dark:border-white/5">
            Cover jacket artwork in design...
          </span>
        )}
      </div>

      <DocumentPreviewModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={title}
        projectId={projectId}
        initialType={activeType}
        hasLayout={hasLayout}
        hasCover={hasCover}
      />
    </>
  );
}
