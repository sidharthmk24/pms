"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollButton } from "@/components/scroll-nav";
import ArrowRight from "@/components/ui/arrow-right";

interface PublicHeaderActionsProps {
  user: {
    name: string;
    email: string;
    role: string;
  } | null;
}

export function PublicHeaderNav() {
  const pathname = usePathname();
  const isPublishPage = pathname === "/publish" || pathname === "/";

  if (isPublishPage) {
    return (
      <nav className="hidden md:flex items-center gap-7 text-[13px] font-semibold text-foreground/80">
        <ScrollButton
          to="guidelines"
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Guidelines
        </ScrollButton>
        <ScrollButton
          to="genres"
          className="hover:text-primary transition-colors cursor-pointer"
        >
          Genres
        </ScrollButton>
        <ScrollButton
          to="process"
          className="hover:text-primary transition-colors cursor-pointer"
        >
          How It Works
        </ScrollButton>
        <Link href="/publish/status" className="hover:text-primary transition-colors inline-flex items-center gap-1.5">
          <span>Track Manuscript</span>
        </Link>
      </nav>
    );
  }

  return (
    <nav className="hidden md:flex items-center gap-7 text-[13px] font-semibold text-foreground/80">
      <Link href="/publish#guidelines" className="hover:text-primary transition-colors">
        Guidelines
      </Link>
      <Link href="/publish#genres" className="hover:text-primary transition-colors">
        Genres
      </Link>
      <Link href="/publish#process" className="hover:text-primary transition-colors">
        How It Works
      </Link>
      <Link href="/publish/status" className="hover:text-primary transition-colors inline-flex items-center gap-1.5">
        <span>Track Manuscript</span>
      </Link>
    </nav>
  );
}

export function PublicHeaderActions({ user }: PublicHeaderActionsProps) {
  const pathname = usePathname();
  const isPublishPage = pathname === "/publish" || pathname === "/";

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/publish/status"
        className="apple-button hidden sm:inline-flex rounded-sm border border-[#7e2562]/20 bg-white px-4 py-2.5 text-xs font-bold text-primary shadow-xs hover:bg-[#faedf5] transition-all"
      >
        Track Status
      </Link>

      {user ? (
        <>
          <Link
            href="/author"
            className="apple-button inline-flex items-center gap-2 rounded-sm border border-[#7e2562]/25 bg-[#faf6f9] px-3.5 py-2 text-xs font-bold text-[#7e2562] hover:bg-[#faedf5] transition-all"
            title="Go to Author Dashboard"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7e2562] text-[10px] font-black text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="max-w-[120px] truncate">{user.name}</span>
          </Link>

          <Link
            href="/author/submit"
            className="apple-button inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-primary-hover hover:shadow-plum-md transition-all"
          >
            <span>Submit Manuscript</span>
            <svg
              className="h-4 w-4 opacity-90 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </>
      ) : (
        <>
          {/* Sign In Button: Smooth scrolls to auth card with login mode */}
          <ScrollButton
            to="auth"
            mode="login"
            className="apple-button inline-flex items-center gap-1.5 rounded-sm border border-[#7e2562]/25 bg-white px-4 py-2.5 text-xs font-bold text-[#7e2562] shadow-xs hover:bg-[#faedf5] transition-all cursor-pointer"
          >
   
            <span>Author Sign In</span>
          </ScrollButton>

          {/* Submit Manuscript Button: Smooth scrolls down to auth card */}
          {isPublishPage ? (
            <ScrollButton
              to="auth"
              className="apple-button inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-primary-hover hover:shadow-plum-md transition-all cursor-pointer"
            >
              <span>Submit Manuscript</span>
              <svg
                className="h-4 w-4 opacity-90 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </ScrollButton>
          ) : (
            <Link
              href="/publish?need_login=1#auth"
              className="apple-button inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-primary-hover hover:shadow-plum-md transition-all"
            >
              <span>Submit Manuscript</span>
              <svg
                className="h-4 w-4 opacity-90 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          )}
        </>
      )}
    </div>
  );
}

export function BannerSubmitAction({ user }: { user: boolean }) {
  if (user) {
    return (
      <Link
        href="/author/submit"
        className="underline decoration-[#7e2562]/40 hover:decoration-[#7e2562] font-bold ml-1"
      >
        <span className="inline-flex items-center gap-1">Submit Your Manuscript <ArrowRight size={11} /></span>
      </Link>
    );
  }

  return (
    <ScrollButton
      to="auth"
      mode="login"
      className="underline decoration-[#7e2562]/40 hover:decoration-[#7e2562] font-bold ml-1 cursor-pointer"
    >
      <span className="inline-flex items-center gap-1">Sign In to Submit <ArrowRight size={11} /></span>
    </ScrollButton>
  );
}
