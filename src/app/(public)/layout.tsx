import Link from "next/link";
import Image from "next/image";
import AuthorAuthModal, { AuthorModalTrigger } from "@/components/author-auth-modal";
import AnimatedSection from "@/components/animated-section";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative min-h-dvh flex flex-col bg-background selection:bg-primary selection:text-white">
      {/* Global Author Onboarding & Auth Modal */}
      <AuthorAuthModal />

      {/* Brand Ambient Plum Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden opacity-70"
      >
        <div className="absolute left-1/2 top-[-140px] h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#7e2562]/[0.09] via-[#9b3179]/[0.03] to-transparent blur-3xl" />
        <div className="absolute right-10 top-20 h-[300px] w-[300px] rounded-full bg-[#7e2562]/[0.04] blur-2xl" />
      </div>

      {/* Top Banner Notice (Hidden on Print) */}
      <AnimatedSection
        as="div"
        animation="fade-down"
        duration={0.65}
        delayMs={0}
        className="no-print border-b border-[#7e2562]/10 bg-[#7E2562] px-4 py-2 text-center text-xs font-semibold text-white"
      >
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2">
           
          </span>
          <span>Editorial Submissions Open for 2026 Malayalam &amp; English Manuscripts</span>
          <Link
            href="/publish/onboarding"
            className="underline decoration-white hover:decoration-[#cea4c1] font-bold ml-1"
          >
            Submit Now
          </Link>
        </span>
      </AnimatedSection>

      {/* Luxury Translucent Header (Hidden completely on print to avoid duplicate logo) */}
      <AnimatedSection
        as="header"
        animation="fade-down"
        duration={0.7}
        delayMs={90}
        className="no-print sticky top-0 z-40 border-b border-[#7e2562]/10 bg-white/90 backdrop-blur-2xl shadow-[0_2px_12px_-4px_rgba(126,37,98,0.06)]"
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          {/* Logo & Brand Tag */}
          <Link href="/publish" className="apple-button flex items-center gap-3.5 group">
            <Image
              src="/logo.png"
              alt="Kairali Books"
              width={170}
              height={42}
              priority
              className="h-8 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          {/* Center Navigation Links (Hidden on Print) */}
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
               <Link href="/publish#faq" className="hover:text-primary transition-colors">
              FAQ's
            </Link>
          </nav>

          {/* Right Action CTAs (Hidden on Print) */}
          <div className="no-print flex items-center gap-3">
            <Link
              href="/publish/status"
              className="apple-button hidden sm:inline-flex rounded-sm border border-[#7e2562]/20 bg-white px-4 py-2.5 text-xs font-bold text-primary shadow-xs hover:bg-[#faedf5] transition-all"
            >
              Track Status
            </Link>

            <AuthorModalTrigger
              mode="login"
              className="apple-button inline-flex items-center gap-1.5 rounded-sm border border-[#7e2562]/25 bg-white px-4 py-2.5 text-xs font-bold text-[#7e2562] shadow-xs hover:bg-[#faedf5] transition-all cursor-pointer"
            >
              <span>Author Sign In</span>
            </AuthorModalTrigger>

            <Link
              href="/publish/onboarding"
              className="apple-button inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-primary-hover hover:shadow-plum-md cursor-pointer transition-all"
            >
              <span>Submit Manuscript</span>
              <svg className="h-4 w-4 opacity-90 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection as="main" animation="fade-up" duration={0.8} delayMs={160} className="flex-1">
        {children}
      </AnimatedSection>

      {/* Editorial Publishing Footer (Hidden on Print) */}
      <AnimatedSection as="footer" animation="fade-up" delayMs={60} className="no-print border-t border-[#7e2562]/10 bg-gradient-to-b from-white to-[#faf6f9]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-4 sm:grid-cols-2">
            {/* Col 1: Brand Info */}
            <div className="md:col-span-3 space-y-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Kairali Books"
                  width={150}
                  height={38}
                  className="h-7 w-auto object-contain"
                />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground max-w-md">
                Kairali Books is Kerala’s distinguished Malayalam publishing house, championing groundbreaking fiction, poetry, academic research, and timeless literature since 1998.
              </p>
           
            </div>

            {/* Col 2: Author Links */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
                Author Resources
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/publish#guidelines" className="text-muted-foreground hover:text-primary transition-colors">
                    Submission Guidelines
                  </Link>
                </li>
                <li>
                  <Link href="/publish/onboarding" className="text-muted-foreground hover:text-primary transition-colors cursor-pointer text-left">
                    Submit a Manuscript
                  </Link>
                </li>
                <li>
                  <AuthorModalTrigger mode="login" className="text-muted-foreground hover:text-primary transition-colors cursor-pointer text-left">
                    Author Sign In
                  </AuthorModalTrigger>
                </li>
                <li>
                  <Link href="/publish/status" className="text-muted-foreground hover:text-primary transition-colors">
                    Track Live Status
                  </Link>
                </li>
                {/* <li>
                  <Link href="/publish#genres" className="text-muted-foreground hover:text-primary transition-colors">
                    Accepted Categories
                  </Link>
                </li> */}
              </ul>
            </div>

            {/* Col 3: Portal Access & Info */}
            {/* <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
                Publisher Network
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                    Staff &amp; Editor Portal &rarr;
                  </Link>
                </li>
                <li>
                  <Link href="/author" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                    Author Dashboard &rarr;
                  </Link>
                </li>
                <li>
                  <span className="text-xs text-muted-foreground">
                    Direct royalty settlements, digital agreements &amp; global distribution.
                  </span>
                </li>
              </ul>
            </div> */}
          </div>

          {/* Bottom copyright line */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#7e2562]/10 pt-8 sm:flex-row text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Kairali Books. All intellectual rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="font-ml text-primary/80 font-medium">കൈരളി ബുക്സ് — അക്ഷരങ്ങളുടെ ലോകം</span>
              <span className="hidden sm:inline text-muted-foreground/40">|</span>
              <Link href="/login" className="hover:text-primary transition-colors">
                Internal Portal
              </Link>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}



