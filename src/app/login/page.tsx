import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "./login-form";

export const metadata: Metadata = { title: "Sign in · Kairali Books" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : "/dashboard";

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

      <div className="relative z-10 w-full max-w-[400px] animate-apple-in">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 transition-transform duration-300 hover:scale-[1.02]">
            <Image
              src="/logo.png"
              alt="Kairali Books"
              width={220}
              height={55}
              priority
              className="h-10 w-auto object-contain"
            />
          </div>
          <span className="inline-flex items-center gap-2 rounded-sm bg-[#7e2562]/8 px-3.5 py-1 text-xs font-bold text-[#7e2562]">
            Publisher Management System
          </span>
        </div>

        {/* Login Container */}
        <div className="rounded-sm border border-[#7e2562]/15 bg-white p-7 shadow-plum-md sm:p-8">
          <LoginForm nextPath={nextPath} />
        </div>

        {/* Footer Support Prompt */}
        <div className="mt-7 text-center">
          <p className="text-[13px] text-muted-foreground">
            Author without access?{" "}
            <Link
              href="/publish"
              className="font-bold text-[#7e2562] hover:underline"
            >
              Author Portal
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

