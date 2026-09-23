"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

export interface StageConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  title?: string;
  subtitle?: string;
  message?: string;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  confirmVariant?: "primary" | "warning";
  // Optional legacy props kept for backward compatibility
  currentStage?: string;
  nextStage?: string;
  description?: string;
  file?: { name: string; size?: number } | null;
  metadata?: Array<{ label: string; value: string; [key: string]: any }>;
  iconType?: "arrow" | "rework" | "publish" | "print";
}

export default function StageConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  pending,
  title,
  subtitle,
  message,
  confirmText = "Yes, Continue",
  cancelText = "No, Cancel",
  confirmVariant = "primary",
  nextStage,
  iconType = "arrow",
}: StageConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, pending, onClose]);

  if (!mounted || !isOpen) return null;

  const displayTitle = title || (
    iconType === "rework"
      ? "Send for Rework?"
      : "Are you sure you want to move to the next step?"
  );

  const displayMessage = message || subtitle || (
    nextStage
      ? `Are you sure you want to complete this step and proceed to ${nextStage}?`
      : "Are you sure you want to complete this step and move to the next step?"
  );

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={() => !pending && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1318] animate-in zoom-in-95 duration-150 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close 'X' Button */}
        <button
          type="button"
          disabled={pending}
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-muted-foreground transition hover:bg-black/10 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/15 cursor-pointer disabled:opacity-40"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7e2562]/10 text-[#7e2562] dark:bg-pink-500/15 dark:text-pink-300">
          {iconType === "rework" ? (
            <RotateCcw className="h-6 w-6" />
          ) : (
            <HelpCircle className="h-6 w-6" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-foreground leading-snug">
          {displayTitle}
        </h3>

        {/* Message */}
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          {displayMessage}
        </p>

        {/* Action Buttons: Simple Yes / No */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="flex-1 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-black/5 hover:text-foreground transition cursor-pointer dark:border-white/15 dark:bg-surface dark:hover:bg-surface-muted"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              confirmVariant === "warning" || iconType === "rework"
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-[#7e2562] hover:bg-[#6b1e52] shadow-plum-sm"
            }`}
          >
            {pending ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
