import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ResetPasswordForm from "./reset-password-form";

export const metadata: Metadata = { title: "Reset Password · Kairali Books" };

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12 selection:bg-primary selection:text-white bg-background">
      {/* Brand plum ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <div className="h-[520px] w-[680px] -translate-y-12 rounded-full bg-[#7e2562]/[0.07] blur-[100px]" />
        <div className="h-[300px] w-[400px] translate-y-24 rounded-full bg-[#9b3179]/[0.04] blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-apple-in">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/login" className="mb-3 transition-transform duration-300 hover:scale-[1.02]">
            <Image
              src="/logo.png"
              alt="Kairali Books"
              width={220}
              height={55}
              priority
              className="h-10 w-auto object-contain"
            />
          </Link>
          <span className="inline-flex items-center gap-2 rounded-sm bg-[#7e2562]/8 px-3.5 py-1 text-xs font-bold text-[#7e2562]">
            Publisher Management System
          </span>
        </div>

        {/* Card Container */}
        <div className="rounded-sm border border-[#7e2562]/15 bg-white p-7 shadow-plum-md sm:p-8">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <div className="h-8 w-8 border-3 border-[#7e2562] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-muted-foreground">Loading…</p>
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>

        {/* Footer Support Prompt */}
        <div className="mt-7 text-center">
          <p className="text-[13px] text-muted-foreground">
            Need help?{" "}
            <a
              href="mailto:support@kairalibooks.com"
              className="font-bold text-[#7e2562] hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
