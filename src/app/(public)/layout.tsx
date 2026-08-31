import Link from "next/link";
import Image from "next/image";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative min-h-dvh flex flex-col bg-background selection:bg-foreground selection:text-background">
      {/* Background Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] overflow-hidden opacity-50 dark:opacity-30"
      >
        <div className="absolute left-1/2 top-[-100px] h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-black/[0.04] via-black/[0.01] to-transparent blur-3xl dark:from-white/[0.06] dark:via-white/[0.01]" />
      </div>

      {/* Apple-style Glass Header */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-surface/85 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-surface/75">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-6">
          <Link href="/publish" className="apple-button flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Kairali Books"
              width={180}
              height={45}
              priority
              className="h-8 w-auto object-contain dark:invert"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/publish/status"
              className="apple-button hidden rounded-xl border border-black/10 bg-surface px-4 py-2.5 text-xs font-bold text-foreground shadow-xs hover:bg-black/5 dark:border-white/10 dark:bg-surface-muted/60 dark:hover:bg-white/10 sm:inline-flex"
            >
              Track Submission
            </Link>
            <Link
              href="/publish/submit"
              className="apple-button inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary-hover"
            >
              <span>Submit Manuscript</span>
              <svg className="h-4 w-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-black/[0.06] bg-surface/80 backdrop-blur-md dark:border-white/[0.08]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="Kairali Books"
              width={130}
              height={32}
              className="h-6 w-auto object-contain opacity-70 dark:invert"
            />
            <span className="hidden text-xs text-muted-foreground sm:inline">|</span>
            <span className="text-xs text-muted-foreground">
              Malayalam Book Publishing & Distribution
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/publish/status" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Check Status
            </Link>
            <Link href="/login" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Staff Portal
            </Link>
            <span className="text-xs font-medium text-muted-foreground">
              © {new Date().getFullYear()} Kairali Books
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}


