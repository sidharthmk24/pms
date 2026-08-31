import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./login-form";

export const metadata: Metadata = { title: "Sign in · Kairali Books" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/dashboard";

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12 selection:bg-foreground selection:text-background">
      {/* Apple-style subtle ambient background glow */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <div className="h-[480px] w-[640px] -translate-y-12 rounded-full bg-foreground/[0.025] blur-[100px] dark:bg-foreground/[0.035]" />
      </div>

      <div className="relative z-10 w-full max-w-[390px] animate-apple-in">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 transition-transform duration-300 hover:scale-[1.02]">
            <Image
              src="/logo.png"
              alt="Kairali Books"
              width={220}
              height={55}
              priority
              className="h-10 w-auto object-contain dark:invert"
            />
          </div>
          <p className="text-[13px] font-medium text-muted-foreground">
            Publisher Management System
          </p>
        </div>

        {/* Apple Glass Container */}
        <div className="rounded-[24px] border border-black/[0.08] bg-surface/90 p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgb(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.12] dark:bg-surface/85 dark:shadow-[0_20px_50px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.06)] sm:p-8">
          <LoginForm nextPath={nextPath} />
        </div>

        {/* Footer Support Prompt */}
        <div className="mt-7 text-center">
          <p className="text-[13px] text-muted-foreground">
            Trouble signing in?{" "}
            <a
              href="mailto:admin@kairalibooks.in"
              className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground/80 hover:decoration-foreground"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

