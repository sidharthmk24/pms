"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
  X,
  Maximize2,
  Minimize2,
  AlertCircle,
} from "lucide-react";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

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
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setSecurityAlert(null);
    }, 2500);
  }, []);

  // Keyboard shortcut listeners
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
        return;
      }

      // Print shortcut interception
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Printing is restricted on proof review documents.");
        return;
      }

      // Save shortcut interception
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Direct document saving is restricted.");
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onClose, isFullscreen, triggerSecurityWarning]);

  if (!mounted || !isOpen) return null;

  const authParams = new URLSearchParams();
  authParams.set("type", activeType);
  authParams.set("mode", "inline");
  if (refNo) authParams.set("ref", refNo);
  if (email) authParams.set("email", email);

  const pdfUrl = `/api/public/production/${projectId}/download?${authParams.toString()}#toolbar=0&navpanes=0&scrollbar=1`;
  const imageUrl = `/api/public/production/${projectId}/download?${authParams.toString()}`;

  const watermarkText = `CONFIDENTIAL PROOF · KAIRALI BOOKS · ${email || refNo || "REVIEW ONLY"} · ALL RIGHTS RESERVED`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 md:p-6 select-none animate-apple-in"
      onContextMenu={(e) => {
        e.preventDefault();
        triggerSecurityWarning("Right-click context menu is restricted on proof assets.");
        return false;
      }}
      onDragStart={(e) => {
        e.preventDefault();
        return false;
      }}
    >
      {/* Print media blocker */}
      <style>{`
        @media print {
          body { display: none !important; }
        }
      `}</style>

      {/* Dark backdrop blur */}
      <div
        className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        ref={modalContainerRef}
        className={`relative z-10 flex flex-col w-full transition-all duration-300 rounded-2xl border border-white/10 bg-neutral-950 text-white shadow-2xl overflow-hidden ${
          isFullscreen
            ? "fixed inset-2 sm:inset-4 h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] max-w-none rounded-2xl"
            : "h-[92vh] max-w-6xl"
        }`}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-neutral-900/90 px-5 py-3 backdrop-blur-md">
          {/* Left: Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white shadow-xs">
              {activeType === "layout" ? (
                <FileText className="h-5 w-5 text-white/90" />
              ) : (
                <ImageIcon className="h-5 w-5 text-white/90" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-extrabold text-white">
                  {title}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 shrink-0">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  <span>Protected Proof View</span>
                </span>
              </div>
              <p className="text-[11px] text-white/60 truncate">
                {activeType === "layout" ? "Typeset Interior Layout PDF" : "Full Cover Jacket Artwork"} · Read-Only Preview
              </p>
            </div>
          </div>

          {/* Right: Controls & Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher Tabs */}
            {hasLayout && hasCover && (
              <div className="flex items-center rounded-xl bg-white/10 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveType("layout")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeType === "layout"
                      ? "bg-white text-neutral-950 shadow-xs"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Typeset Layout</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveType("cover")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeType === "cover"
                      ? "bg-white text-neutral-950 shadow-xs"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Cover Artwork</span>
                </button>
              </div>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/80 hover:bg-red-500/80 hover:text-white transition font-bold cursor-pointer ml-1"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Floating Security Alert Toast */}
        {securityAlert && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-neutral-900/95 px-4 py-2.5 text-xs font-semibold text-amber-300 shadow-2xl backdrop-blur-md animate-apple-in">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{securityAlert}</span>
          </div>
        )}

        {/* Content Body Area */}
        <div className="relative flex-1 bg-neutral-950 overflow-hidden flex items-center justify-center">
          {/* Active View Renderer */}
          {activeType === "layout" ? (
            <div className="h-full w-full bg-neutral-900 relative flex flex-col">
              <iframe
                src={pdfUrl}
                title="Typeset Interior Layout PDF"
                className="h-full w-full border-0 bg-neutral-900"
              />

              {/* Watermark Overlay floating directly on top of the PDF reader */}
              <div
                className="pointer-events-none absolute inset-0 bottom-9 z-30 overflow-hidden select-none"
                aria-hidden="true"
              >
                <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern
                      id="pdf-watermark"
                      width="450"
                      height="240"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(-26)"
                    >
                      <text
                        x="20"
                        y="60"
                        fill="#000000"
                        fillOpacity="0.13"
                        fontSize="12"
                        fontWeight="800"
                        letterSpacing="2.5"
                        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont"
                      >
                        {watermarkText}
                      </text>
                      <text
                        x="240"
                        y="180"
                        fill="#000000"
                        fillOpacity="0.13"
                        fontSize="12"
                        fontWeight="800"
                        letterSpacing="2.5"
                        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont"
                      >
                        {watermarkText}
                      </text>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#pdf-watermark)" />
                </svg>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 bg-neutral-900 px-4 py-2 text-[11px] text-white/60 shrink-0 z-40 relative">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Protected In-Browser Reader · Direct Downloads Disabled</span>
                </div>
                <span className="text-white/60">Kairali Books Production</span>
              </div>
            </div>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center p-4 sm:p-8 bg-neutral-950 overflow-auto">
              {/* Watermark directly on top of the Cover Artwork */}
              <div
                className="pointer-events-none absolute inset-0 z-30 overflow-hidden select-none"
                aria-hidden="true"
              >
                <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern
                      id="cover-watermark"
                      width="450"
                      height="240"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(-26)"
                    >
                      <text
                        x="20"
                        y="60"
                        fill="#ffffff"
                        fillOpacity="0.14"
                        fontSize="12"
                        fontWeight="800"
                        letterSpacing="2.5"
                        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont"
                      >
                        {watermarkText}
                      </text>
                      <text
                        x="240"
                        y="180"
                        fill="#ffffff"
                        fillOpacity="0.14"
                        fontSize="12"
                        fontWeight="800"
                        letterSpacing="2.5"
                        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont"
                      >
                        {watermarkText}
                      </text>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#cover-watermark)" />
                </svg>
              </div>

              <div
                className="absolute inset-0 z-20 cursor-default"
                onContextMenu={(e) => {
                  e.preventDefault();
                  triggerSecurityWarning("Cover artwork saving is restricted.");
                  return false;
                }}
              />

              {/* Cover Image */}
              <div className="relative z-10 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`${title} Cover Artwork`}
                  draggable={false}
                  className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10 ring-1 ring-white/5 pointer-events-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
