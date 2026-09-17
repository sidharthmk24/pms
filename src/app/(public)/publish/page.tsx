import type { Metadata } from "next";
import Link from "next/link";
import { getResponseWeeks, submissionsOpen } from "@/lib/settings";
import { GENRES } from "@/lib/submission-fields";
import { ALLOWED_LABEL, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { getSessionUser } from "@/lib/session";
import { AuthorModalTrigger } from "@/components/author-auth-modal";
import PublishFaq from "./publish-faq";
import PublishProcessSteps from "./publish-process-steps";
import AnimatedSection from "@/components/animated-section";

export const metadata: Metadata = {
  title: "Publish With Us · Kairali Books",
  description:
    "Submit your manuscript to Kairali Books. Rigorous editorial evaluation, fair author royalties, and statewide distribution.",
};
export const dynamic = "force-dynamic";

export default async function PublishGuidelinesPage() {
  const [weeks, open, currentUser] = await Promise.all([
    getResponseWeeks(),
    submissionsOpen(),
    getSessionUser(),
  ]);
  const maxMb = MAX_UPLOAD_BYTES / 1024 / 1024;

  const GENRE_DESCRIPTIONS: Record<string, string> = {
    novel: "Contemporary fiction, historical epics, thrillers, social narratives",
    short_stories: "Anthologies, themed story collections, flash fiction",
    poetry: "Original verse, poetic anthologies, lyrical compositions",
    essays: "Critical essays, cultural commentaries, social studies",
    biography: "Memoirs, historical figures, autobiography, reminiscences",
    childrens: "Illustrated tales, folklore, adolescent fiction, learning books",
    translation: "Authorized translations from world classics & Indian languages",
    drama: "Stage plays, screenplays, dramatic monologues, performative scripts",
    travelogue: "Journeys, memoirs, regional explorations, cultural discovery",
    academic: "Scholarly monographs, linguistics, reference works & research",
    other: "Specialized literary projects, hybrid genres, unique collections",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-12">
      {/* ── 1. Hero Section ────────────────────────────────────────── */}
      <AnimatedSection animation="fade-up" className="relative mb-16 text-center lg:text-left">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="max-w-3xl">
            {/* Live Submissions Status Badge */}
            {/* <div className="mb-5 inline-flex items-center gap-2.5 rounded-sm border border-[#7e2562]/20 bg-[#faedf5] px-4 py-1.5 text-xs font-bold text-[#7e2562] shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7e2562] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7e2562]" />
              </span>
              <span>Kairali Books Editorial Board · Submissions Open</span>
            </div> */}

            {/* Main Headline */}
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-[1.12]">
              Publish Your Literary Work With{" "}
              <span className="bg-gradient-to-r from-[#7e2562] via-[#9b3179] to-[#681b50] bg-clip-text text-transparent">
                Kairali Books
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-xl leading-relaxed text-muted-foreground font-normal">
              For over two decades, Kairali Books has been Kerala&apos;s proud home for literary fiction, poetry, academic research, and timeless Malayalam literature. We offer rigorous editorial guidance, fair contracts, and statewide distribution.
            </p>

            {/* Value Highlights Pills */}
            {/* <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-sm border border-emerald-200 bg-emerald-50/90 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Zero Reading Fees</span>
              </span>

              <span className="inline-flex items-center gap-2 rounded-sm border border-[#7e2562]/15 bg-white px-3.5 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs">
                <svg className="h-3.5 w-3.5 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{weeks}-Week Turnaround</span>
              </span>

              <span className="inline-flex items-center gap-2 rounded-sm border border-[#7e2562]/15 bg-white px-3.5 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs">
                <svg className="h-3.5 w-3.5 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Digital Royalty Contracts</span>
              </span>

              <span className="inline-flex items-center gap-2 rounded-sm border border-[#7e2562]/15 bg-white px-3.5 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs">
                <svg className="h-3.5 w-3.5 text-[#7e2562]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
                <span>Kerala &amp; Global Reach</span>
              </span>
            </div> */}

            {/* Action Buttons (Opening Modal) */}
     
          </div>

          {/* Right Brand Card / Telemetry Badge */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="rounded-sm border border-[#7e2562]/15 bg-gradient-to-b from-white to-[#faf6f9] p-6 shadow-plum-sm">
              <div className="flex items-center gap-3 pb-5 border-b border-[#7e2562]/10">
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-[#7e2562] text-white shadow-xs">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Kairali Books</h2>
                  <p className="font-ml text-xs text-primary font-bold">കൈരളി പബ്ലിഷിംഗ്</p>
                </div>
              </div>

              <div className="mt-5 space-y-4 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground font-medium">Evaluation Period</span>
                  <span className="font-bold text-foreground bg-[#7e2562]/8 px-2.5 py-1 rounded-sm text-primary">
                    {weeks} Weeks
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground font-medium">Max Document Size</span>
                  <span className="font-bold text-foreground">{maxMb} MB</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground font-medium">Accepted File Formats</span>
                  <span className="font-bold text-primary font-mono">PDF, DOCX, ODT</span>
                </div>
                <div className="flex items-center justify-between py-1 pt-2 border-t border-[#7e2562]/10">
                  <span className="text-muted-foreground font-medium">Royalties &amp; Rights</span>
                  <span className="font-bold text-foreground">Author Retained</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#7e2562]/10 space-y-2">
                {currentUser ? (
                  <>
                    <Link
                      href="/author/submit"
                      className="apple-button flex w-full items-center justify-center gap-2 rounded-sm bg-[#7e2562] py-2.5 text-xs font-bold text-white hover:bg-[#681b50] shadow-plum-xs transition-all"
                    >
                      <span>Submit Manuscript</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                    <Link
                      href="/author"
                      className="apple-button flex w-full items-center justify-center gap-2 rounded-sm border border-[#7e2562]/20 bg-white py-2 text-xs font-bold text-[#7e2562] hover:bg-[#faedf5] transition-all"
                    >
                      <span>Author Dashboard</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <AuthorModalTrigger
                      mode="signup"
                      step={1}
                      className="apple-button flex w-full items-center justify-center gap-2 rounded-sm bg-[#7e2562] py-2.5 text-xs font-bold text-white hover:bg-[#681b50] shadow-plum-xs transition-all cursor-pointer"
                    >
                      <span>Submit Manuscript</span>
                      <span aria-hidden="true">&rarr;</span>
                    </AuthorModalTrigger>
                    <AuthorModalTrigger
                      mode="login"
                      className="apple-button flex w-full items-center justify-center gap-2 rounded-sm border border-[#7e2562]/20 bg-white py-2 text-xs font-bold text-[#7e2562] hover:bg-[#faedf5] transition-all cursor-pointer"
                    >
                      <span>Author Log In</span>
                    </AuthorModalTrigger>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ── 2. The Four Pillars of Kairali Publishing ────────────────── */}
      <AnimatedSection animation="fade-up" delayMs={50} className="mb-16">
        <div className="text-center mb-10">
       
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            A Trusted Home for Dedicated Authors
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            From individual creators to renowned literary figures, we empower writers with professional craftsmanship, transparency, and statewide prominence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: "Rigorous Editorial Peer Review",
              desc: "Every submitted manuscript is thoroughly examined by experienced Malayalam literary scholars with constructive feedback.",
              icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
              colorClass: "bg-[#FFF1F2] border-[#FECDD3] hover:border-[#FDA4AF]",
            },
            {
              title: "100% Author Copyright",
              desc: "You retain the intellectual rights to your book. We offer fair, transparent royalty terms on MRP and net receipts.",
              icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
              colorClass: "bg-[#F0F9FF] border-[#BAE6FD] hover:border-[#7DD3FC]",
            },
            {
              title: "Bespoke DTP & Jacket Art",
              desc: "Our production studio handles high-precision Malayalam typesetting, cover design, ISBN allocation, and premium paper printing.",
              icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
              colorClass: "bg-[#F0FDF4] border-[#BBF7D0] hover:border-[#86EFAC]",
            },
            {
              title: "Statewide Kerala Distribution",
              desc: "Immediate physical presence across Kerala bookstores, cultural hubs, book festivals, and leading global digital sales channels.",
              icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064",
              colorClass: "bg-[#FFFBEB] border-[#FDE68A] hover:border-[#FCD34D]",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`rounded-sm border ${item.colorClass} p-6 shadow-xs hover:-translate-y-1 transition-all duration-200`}
            >
              <div className="mb-4 text-black flex items-center">
                <svg className="h-7 w-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <h3 className="text-base font-extrabold text-foreground leading-snug">
                {item.title}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </AnimatedSection>

      {/* ── 3. Accepted Genres & Categories ───────────────────────── */}
      <AnimatedSection id="genres" animation="fade-up" delayMs={50} className="mb-16 scroll-mt-24">
        <div className="rounded-sm border border-[#7e2562]/15 bg-white p-7 shadow-plum-sm sm:p-10">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
            
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Accepted Literary Genres
              </h2>
              <p className="mt-1 text-sm sm:text-base text-muted-foreground max-w-2xl">
                We accept completed original manuscripts in Malayalam and English, as well as authorized translations of classic and contemporary world literature.
              </p>
            </div>

          </div>

          {/* Genre Grid */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GENRES.filter((g) => g.value !== "other").map((g) => (
              <div
                key={g.value}
                className="group flex flex-col justify-between rounded-sm border border-[#7e2562]/10 bg-gradient-to-b from-white to-[#faf6f9]/50 p-4.5 transition-all duration-200 hover:border-[#7e2562]/35 hover:shadow-plum-sm hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {g.en}
                    </h3>
                    <span className="font-ml text-sm font-bold text-primary bg-[#7e2562]/8 px-2.5 py-0.5 rounded-sm">
                      {g.ml}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {GENRE_DESCRIPTIONS[g.value] ?? "Original creative and critical works"}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-primary opacity-70 group-hover:opacity-100 transition-opacity">
                  <AuthorModalTrigger
                    mode="signup"
                    step={1}
                    className="inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Submit Your Work</span>
                    <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                  </AuthorModalTrigger>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ── 4. What to Prepare Checklist ──────────────────────────── */}
      <AnimatedSection id="guidelines" animation="fade-up" delayMs={50} className="mb-16 scroll-mt-24">
        <div className="mb-12 text-center max-w-2xl mx-auto">
       
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            What to Prepare Before Submitting
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            Please verify you have the three essential submission materials ready:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14 max-w-5xl mx-auto">
          {/* Item 1 */}
          <div className="group flex flex-col items-center text-center">
            <div className="h-24 flex items-center justify-center mb-5">
              <svg
                width="122"
                height="158"
                viewBox="0 0 122 158"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-20 w-auto transition-transform duration-300 group-hover:scale-105"
              >
                <path
                  d="M28.5 117.898H67.5M28.5 66.0339H93.5M28.5 91.9661H93.5M119.5 41.3984V41.3964C119.5 34.2346 113.681 28.4323 106.5 28.4323H93.5V15.4662C93.5 8.3053 87.6796 2.50006 80.5 2.50006M119.5 142.534C119.5 149.695 113.68 155.5 106.5 155.5H15.5C8.32043 155.5 2.5 149.695 2.5 142.534V15.4661C2.5 8.30523 8.32043 2.5 15.5 2.5H93.5C107.859 2.5 119.5 14.1102 119.5 28.4322V142.534Z"
                  stroke="#7E2562"
                  strokeWidth="5"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-foreground">01 — Full Manuscript</h3>
            <div className="mt-3 mb-3 flex flex-col items-center justify-center gap-1.5">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider bg-[#7e2562]/8 px-2.5 py-1 rounded-sm">
                Max {maxMb}MB · Single File
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-sm border border-emerald-200">
                {ALLOWED_LABEL}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-sm">
              Please submit a finalized, complete work with all chapters and sections intact. Our editorial committee evaluates complete manuscripts to assess full narrative pacing, language craft, and literary merit.
            </p>
          </div>

          {/* Item 2 */}
          <div className="group flex flex-col items-center text-center">
            <div className="h-24 flex items-center justify-center mb-5">
              <svg
                width="179"
                height="156"
                viewBox="0 0 179 156"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-20 w-auto transition-transform duration-300 group-hover:scale-105"
              >
                <path
                  d="M98.5847 31.966H36.0228M146.548 44.4527H161.013C169.565 44.4527 176.5 51.38 176.5 59.9263V153.5L146.729 132.286C143.328 129.863 139.256 128.56 135.079 128.56H69.5984C61.046 128.56 54.1113 121.633 54.1113 113.087V108.241M98.5847 57.2085H36.0228M2.5 17.9707V111.546L32.2717 90.3307C35.6723 87.9074 39.745 86.6053 43.9221 86.6053H109.4C117.954 86.6053 124.888 79.6787 124.888 71.1345V2.50001H17.9874C9.434 2.50001 2.5 9.42653 2.5 17.9707Z"
                  stroke="#7E2562"
                  strokeWidth="5"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-foreground">02 — Synopsis &amp; Themes</h3>
            <div className="mt-3 mb-3 flex flex-col items-center justify-center gap-1.5">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider bg-[#7e2562]/8 px-2.5 py-1 rounded-sm">
                Min. 100 Characters
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-sm border border-emerald-200">
                Overview &amp; Context
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-sm">
              Highlight the central storyline, thematic core, target readership, and any previous literary works. This gives our reviewers key contextual clarity before diving into the manuscript.
            </p>
          </div>

          {/* Item 3 */}
          <div className="group flex flex-col items-center text-center">
            <div className="h-24 flex items-center justify-center mb-5">
              <svg
                width="163"
                height="136"
                viewBox="0 0 163 136"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-20 w-auto transition-transform duration-300 group-hover:scale-105"
              >
                <path
                  d="M78.8776 91.58H97.2344M78.8776 112.54H105.102M39.5415 83.72C46.7829 83.72 52.6535 77.8551 52.6535 70.62C52.6535 63.3849 46.7829 57.52 39.5415 57.52C32.3 57.52 26.4294 63.3849 26.4294 70.62C26.4294 77.8551 32.3 83.72 39.5415 83.72ZM39.5415 83.72C48.2315 83.72 55.276 90.7579 55.276 99.4399V112.54H23.8071V99.4399C23.8071 90.7579 30.8515 83.72 39.5415 83.72ZM144.438 65.4718V123.675C144.438 129.102 140.035 133.5 134.604 133.5H12.334C6.90237 133.5 2.5 129.102 2.5 123.675V38.5251C2.5 33.0981 6.90237 28.7001 12.334 28.7001H93.2287M115.919 33.94L121.164 44.42L134.276 28.7M160.5 36.56C160.5 55.3709 145.237 70.6199 126.409 70.6199C107.581 70.6199 92.3174 55.3709 92.3174 36.56C92.3174 17.749 107.581 2.5 126.409 2.5C145.237 2.5 160.5 17.749 160.5 36.56Z"
                  stroke="#7E2562"
                  strokeWidth="5"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-foreground">03 — Author Profile</h3>
            <div className="mt-3 mb-3 flex flex-col items-center justify-center gap-1.5">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider bg-[#7e2562]/8 px-2.5 py-1 rounded-sm">
                Instant Confirmation
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-sm border border-emerald-200">
                Email + Tracking Ref
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-sm">
              Your full legal name, pen name, active email, WhatsApp-enabled mobile, and home district so our editors can correspond directly, send evaluation decisions, and prepare contract paperwork.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* ── 5. The 4-Step Publishing Journey ───────────────────────── */}
      <AnimatedSection id="process" animation="fade-up" delayMs={50} className="mb-16 scroll-mt-24">
        <div className="rounded-sm border border-[#7e2562]/15 bg-gradient-to-b from-[#faf6f9] via-white to-white p-7 shadow-plum-sm sm:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              The Kairali Publishing Journey
            </h2>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              What happens step-by-step after you dispatch your manuscript:
            </p>
          </div>

          <PublishProcessSteps
            steps={[
              {
                step: "01",
                title: "Digital Submission",
                subtitle: "Instant Reference Code",
                desc: "Fill the secure online form in under 3 minutes. You receive a unique tracking ID (e.g. SUB-2026-0004) and automated email confirmation.",
              },
              {
                step: "02",
                title: "Editorial Peer Review",
                subtitle: `Guaranteed ${weeks}-Week Evaluation`,
                desc: "Our board of literary scholars and editors reads your full text, evaluating structure, language, thematic vitality, and public relevance.",
              },
              {
                step: "03",
                title: "Agreement & Royalty",
                subtitle: "Digital Signing & Rights",
                desc: "Upon acceptance, review your transparent contract digitally. Agree on royalties, print run, and author copies.",
              },
              {
                step: "04",
                title: "DTP, Cover & Release",
                subtitle: "Statewide Bookstores",
                desc: "Our production studio handles Malayalam typesetting, bespoke jacket design, ISBN allotment, physical printing, and Kerala distribution.",
              },
            ]}
          />
        </div>
      </AnimatedSection>

      {/* ── 6. FAQ & Author Knowledge Base (Interactive) ───────────── */}
      <PublishFaq weeks={weeks} maxMb={maxMb} />

      {/* ── 7. Literary Credo & Heritage Pullquote ──────────────────── */}
      <AnimatedSection animation="fade-up" delayMs={50} className="mb-16">
        <div className="p-8 sm:p-12 text-center ">
          <span className="font-ml text-3xl sm:text-4xl text-primary block mb-3 opacity-90">
            &ldquo;അക്ഷരങ്ങൾ ചിന്തകളെ വെളിച്ചമാക്കുന്നു&rdquo;
          </span>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto italic">
            &ldquo;Words transform solitary thought into collective consciousness. Kairali Books remains committed to celebrating new voices while upholding the deep <br className="md:block hidden" /> heritage of Malayalam literature.&rdquo;
          </p>
          <div className="mt-4 text-xs font-bold uppercase tracking-widest text-[#7e2562]">
            — Kairali Books Editorial Board
          </div>
        </div>
      </AnimatedSection>

      {/* ── 8. Bottom Grand Call-to-Action Banner ─────────────────── */}
      {open && (
        <AnimatedSection animation="fade-scale" delayMs={60} className="relative overflow-hidden rounded-sm bg-gradient-to-br from-[#7e2562] via-[#681b50] to-[#420f32] p-8 text-center text-white shadow-plum-lg sm:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />

          <div className="relative z-10 mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-sm bg-white/15 px-4 py-1.5 text-xs font-bold text-white mb-4 backdrop-blur-md">
              <span>Begin Your Publishing Journey Today</span>
            </span>

            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Ready to Share Your Story <br className="md:block hidden" /> With the World?
            </h2>

            <p className="mt-3 text-base text-white/85 leading-relaxed">
              Join Kerala&apos;s celebrated authors. Submitting your manuscript takes less than 3 minutes, with zero reading fees and guaranteed editorial review.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              {currentUser ? (
                <>
                  <Link
                    href="/author/submit"
                    className="apple-button inline-flex items-center justify-center gap-2.5 rounded-sm bg-white px-8 py-2.5 text-base font-extrabold text-[#7e2562] shadow-lg hover:bg-[#faf2f7]  transition-all"
                  >
                    <span>Submit Manuscript Now</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                
                </>
              ) : (
                <>
                  <Link
                    href="/publish/onboarding"
                    className="apple-button inline-flex items-center justify-center gap-2.5 rounded-sm bg-white px-8 py-2.5 text-base font-extrabold text-[#7e2562] shadow-lg hover:bg-[#faf2f7] hover:scale-[1.02] transition-all cursor-pointer"
                  >
                    <span>Submit Your Manuscript </span><svg className="h-4 w-4 opacity-90 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
                  </Link>

                
                </>
              )}

            
            </div>
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}
