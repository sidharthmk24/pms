"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

export type DocumentPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  projectId: string;
  initialType?: "layout" | "cover";
  hasLayout?: boolean;
  hasCover?: boolean;
  refNo?: string;
  email?: string;
};

export function DocumentPreviewModal({
  isOpen,
  onClose,
  title,
  projectId,
  initialType = "layout",
  hasLayout = true,
  hasCover = true,
  refNo = "",
  email = "",
}: DocumentPreviewModalProps) {
  const [activeType, setActiveType] = useState<"layout" | "cover">(initialType);
  const [mounted, setMounted] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveType(initialType);
  }, [initialType, isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  const triggerSecurityWarning = useCallback((msg: string) => {
    setSecurityAlert(msg);
    // Clear clipboard to intercept screenshot captures
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText("").catch(() => {});
    }
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setSecurityAlert(null);
    }, 2500);
  }, []);

  // Anti-Screenshot & Keyboard Protection Listeners
  useEffect(() => {
    if (!isOpen) return;

    // Window focus loss shield (e.g. Snipping tool, screenshot shortcut, screen capture)
    function handleBlur() {
      setIsWindowBlurred(true);
    }
    function handleFocus() {
      setIsWindowBlurred(false);
    }

    // Keyboard screenshot interception
    function handleKeyDown(e: KeyboardEvent) {
      // Escape key to close modal
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // PrintScreen key
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("⚠️ Screenshots are prohibited on confidential manuscript layout drafts.");
        return;
      }

      // Windows Snipping Tool (Win + Shift + S) or Mac Screenshot (Cmd + Shift + 3 / 4 / 5)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["s", "S", "3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("⚠️ Screen capture is disabled for copyright protection.");
        return;
      }

      // Print shortcut (Ctrl + P or Cmd + P)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("⚠️ Printing is disabled for proof review files.");
        return;
      }

      // Save shortcut (Ctrl + S or Cmd + S)
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("⚠️ Direct file download/saving is disabled.");
        return;
      }

      // DevTools inspection shortcut (F12 or Ctrl+Shift+I / J / C)
      if (e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "I", "j", "J", "c", "C"].includes(e.key))) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("⚠️ Developer tools inspection is restricted.");
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        triggerSecurityWarning("⚠️ Screen captures are restricted on proof materials.");
      }
    }

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [isOpen, onClose, triggerSecurityWarning]);

  if (!mounted || !isOpen) return null;

  const authParams = new URLSearchParams();
  authParams.set("type", activeType);
  authParams.set("mode", "inline");
  if (refNo) authParams.set("ref", refNo);
  if (email) authParams.set("email", email);

  // #toolbar=0&navpanes=0 hides PDF viewer download & print buttons in Chrome, Edge, Safari, Firefox
  const pdfUrl = `/api/public/production/${projectId}/download?${authParams.toString()}#toolbar=0&navpanes=0&scrollbar=1`;
  const imageUrl = `/api/public/production/${projectId}/download?${authParams.toString()}`;

  const watermarkText = `CONFIDENTIAL PROOF · KAIRALI BOOKS · ${email || refNo || "REVIEW ONLY"} · DO NOT CAPTURE OR DISTRIBUTE`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 md:p-6 select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        triggerSecurityWarning("⚠️ Right-click context menu is disabled to protect artwork.");
        return false;
      }}
      onDragStart={(e) => {
        e.preventDefault();
        return false;
      }}
    >
      {/* Print media blocker style */}
      <style>{`
        @media print {
          body { display: none !important; }
        }
      `}</style>

      {/* Dark backdrop blur */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative z-10 flex flex-col h-full max-h-[96vh] w-full max-w-6xl rounded-3xl border border-white/15 bg-neutral-950 text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-neutral-900/95 px-5 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg">
              {activeType === "layout" ? "📄" : "🎨"}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-extrabold tracking-tight text-white">
                  {title}
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  <span>🔒</span>
                  <span>Protected View</span>
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                In-Browser Proof Preview · {activeType === "layout" ? "Typeset Interior PDF" : "Cover Artwork"} · Downloads & Screenshots Disabled
              </p>
            </div>
          </div>

          {/* Tab Selector & Controls */}
          <div className="flex items-center gap-2">
            {hasLayout && hasCover && (
              <div className="flex items-center rounded-xl bg-white/10 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveType("layout")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    activeType === "layout"
                      ? "bg-primary text-white shadow-sm"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  📄 Typeset Layout
                </button>
                <button
                  type="button"
                  onClick={() => setActiveType("cover")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    activeType === "cover"
                      ? "bg-primary text-white shadow-sm"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  🎨 Cover Artwork
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition font-bold cursor-pointer"
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Floating Security Alert Toast */}
        {securityAlert && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-red-500/30 bg-red-950/90 px-4 py-2 text-xs font-bold text-red-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            {securityAlert}
          </div>
        )}

        {/* Content Body Area */}
        <div className="relative flex-1 bg-neutral-900 overflow-hidden flex items-center justify-center">
          
          {/* Focus-Loss / Screenshot-Tool Blackout Shield */}
          {isWindowBlurred ? (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-neutral-950 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-3xl mb-3 border border-white/10 shadow-inner">
                🛡️
              </div>
              <h4 className="text-base font-bold text-white mb-1">
                Content Shield Active
              </h4>
              <p className="max-w-md text-xs text-white/60 mb-4">
                This document is protected against unauthorized capture. Viewing is automatically paused while the browser window is inactive or a capture tool is opened.
              </p>
              <button
                type="button"
                onClick={() => setIsWindowBlurred(false)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
              >
                Click to Resume Viewing
              </button>
            </div>
          ) : null}

          {/* Dynamic Confidential Watermark Overlay Grid */}
          <div
            className="pointer-events-none absolute inset-0 z-30 overflow-hidden opacity-[0.08] select-none flex flex-wrap content-around justify-around p-4"
            aria-hidden="true"
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="m-8 -rotate-25 whitespace-nowrap text-[13px] font-black tracking-widest text-white"
              >
                {watermarkText}
              </div>
            ))}
          </div>

          {/* Active View Renderer */}
          {activeType === "layout" ? (
            <div className="h-full w-full bg-neutral-800 relative">
              <iframe
                src={pdfUrl}
                title="Typeset Interior Layout PDF"
                className="h-full w-full border-0 bg-white"
              />
              <div className="pointer-events-none absolute bottom-3 right-4 rounded-lg bg-black/75 px-3 py-1 text-[11px] text-white/80 backdrop-blur-md border border-white/10">
                🔒 Protected Reader · Page Flipping Enabled · Downloads & Prints Disabled
              </div>
            </div>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center p-4 sm:p-8 bg-neutral-950/90 overflow-auto">
              {/* Invisible transparent DRM shield overlay preventing right-click or drag of the cover image */}
              <div
                className="absolute inset-0 z-20 cursor-default"
                onContextMenu={(e) => {
                  e.preventDefault();
                  triggerSecurityWarning("⚠️ Cover artwork saving is disabled.");
                  return false;
                }}
                onDragStart={(e) => {
                  e.preventDefault();
                  return false;
                }}
              />
              
              {/* Cover Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`${title} Cover Artwork`}
                draggable={false}
                className="relative z-10 max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10 ring-1 ring-white/5 pointer-events-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
