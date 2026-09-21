"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type SectionKey =
  | "overview"
  | "submissions"
  | "contracts"
  | "signing"
  | "author"
  | "production"
  | "team"
  | "accounts";

interface GuideTopic {
  id: string;
  sectionId: SectionKey;
  sectionTitle: string;
  badge: string;
  title: string;
  keywords: string[];
  summary: string;
  details: string[];
  linkHref?: string;
  linkLabel?: string;
}

const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: "roles-overview",
    sectionId: "overview",
    sectionTitle: " System Overview & Roles",
    badge: "Core",
    title: "System Roles & Operational Capabilities",
    keywords: ["roles", "owner", "editor", "production", "author", "store", "accounts", "permissions", "access"],
    summary: "Kairali PMS is organized around specialized roles to ensure clear operational handoffs across editorial, production, and author relations.",
    details: [
      "Owner: Complete oversight, commercial contract execution, author royalty payouts, team member administration, and final catalog price locks.",
      "Editor: Manuscript intake evaluation, reviewer assignment, accept/revise/decline decision making, and commercial contract configuration.",
      "Production: DTP typesetting in Malayalam fonts, cover artwork design, galley proof reviews, ISBN allocation, press printing coordination, and warehouse receipts.",
      "Author: Dedicated portal to track manuscript review statuses, view editorial revision feedback, sign contracts, and monitor live typesetting and print progress.",
    ],
  },
  {
    id: "submissions-flow",
    sectionId: "submissions",
    sectionTitle: "Submissions & Editorial Review",
    badge: "Editorial",
    title: "Manuscript Intake & Public Submission Portal",
    keywords: ["submissions", "publish", "intake", "author", "manuscript", "tracking", "upload", "synopsis"],
    summary: "Authors submit manuscripts online at /publish/submit with title, Malayalam title, synopsis, genre, and manuscript files.",
    details: [
      "Automated Reference Number: Every submission receives a unique reference code (e.g. KB-SUB-2026-0001).",
      "Public Status Dashboard: Authors can check the status of their manuscript anytime at /publish/status using their reference code.",
      "Editorial Filtering: Editors can filter submissions instantly by status (New, Under Review, Needs Revision, Accepted) and assigned editor.",
    ],
    linkHref: "/submissions",
    linkLabel: "Go to Submissions →",
  },
  {
    id: "editorial-decisions",
    sectionId: "submissions",
    sectionTitle: "Submissions & Editorial Review",
    badge: "Editorial",
    title: "Editorial Review & Decision Making",
    keywords: ["review", "decision", "accept", "revision", "reject", "decline", "editor notes", "feedback"],
    summary: "Assigned editors evaluate manuscripts and submit decisions directly from the review dashboard.",
    details: [
      "Accept: Locks commercial publishing terms (Traditional vs. Author-Assisted, Royalty %, Advance, Term) and creates a draft contract ready for dual-signing.",
      "Request Revision: Adds editorial revision notes; the author is alerted on their Author Dashboard and tracking page to submit amendments.",
      "Decline: Sends a respectful editorial decline notification and archives the record.",
    ],
    linkHref: "/submissions",
    linkLabel: "View Submissions →",
  },
  {
    id: "kairali-books-publishing",
    sectionId: "contracts",
    sectionTitle: "Commercial Terms & Contracts",
    badge: "Legal",
    title: "Kairali Books Publishing Track",
    keywords: ["kairali books", "publishing", "royalty", "advance", "mrp", "net", "free copies", "discount", "commercial"],
    summary: "Kairali Books fully finances editing, layout typesetting, proofing, and print runs for selected literary and academic titles.",
    details: [
      "Royalty Rate: Standard 10% to 15% calculated on book MRP (Maximum Retail Price) or Net realizations.",
      "Author Advance: Advance royalty payment credited to the author upon contract execution.",
      "Complimentary Copies: 10 complimentary print copies provided upon release.",
      "Author Purchase Discount: 40% discount on additional copies purchased directly from the publisher.",
    ],
    linkHref: "/contracts",
    linkLabel: "Go to Contracts →",
  },
  {
    id: "self-publishing",
    sectionId: "contracts",
    sectionTitle: " Commercial Terms & Contracts",
    badge: "Legal",
    title: "Author-Assisted Publishing Track",
    keywords: ["self publishing", "author assisted", "gst", "package fee", "tax", "18% gst", "print run"],
    summary: "Authors fund bespoke production packages while receiving professional publishing, distribution, and ISBN registration.",
    details: [
      "Package Fee: Tailored service cost for editing, typesetting, and printing.",
      "GST Compliance: 18% GST is automatically calculated and invoiced on commercial publishing service fees.",
      "Print Distribution: The agreed print quantity is delivered to the author with options for store/online catalog listing.",
    ],
    linkHref: "/contracts",
    linkLabel: "View Contracts →",
  },
  {
    id: "digital-signing",
    sectionId: "signing",
    sectionTitle: "Digital Dual-Signing Workflow",
    badge: "Security",
    title: "Digital Dual-Signing & Legal Execution",
    keywords: ["signing", "dual signing", "signature", "pan", "tds", "bank", "it act", "pdf", "contract"],
    summary: "Paperless publishing contracts legally sealed under the Indian Information Technology Act (IT Act).",
    details: [
      "1. Author Digital Signature: Author accesses /publish/contract/[id], reviews 6 standard articles, enters PAN (for 194J TDS) and bank details, draws or types signature, and accepts legal consent.",
      "2. Publisher Digital Seal: Publisher clicks 'Publisher Sign' in the PMS Contracts view to affix the certified publisher stamp and timestamp.",
      "3. Official A4 PDF Print: Generates formatted legal agreement with official letterhead, terms, and dual cryptographic verification stamps.",
    ],
    linkHref: "/contracts",
    linkLabel: "Contracts Dashboard →",
  },
  {
    id: "author-portal-workflow",
    sectionId: "author",
    sectionTitle: "Author Portal & Account Setup",
    badge: "Author",
    title: "Author Portal & Post-Signing Account Activation",
    keywords: ["author portal", "author dashboard", "setup", "password", "production tracker", "manuscripts", "stepper"],
    summary: "Seamless author self-service portal to monitor submitted books, feedback, contracts, and live production progress.",
    details: [
      "Post-Signing Setup: After digitally signing, the author receives an email link and an immediate on-screen button to create their Author Portal password at /author/setup.",
      "Live Production Stepper: Real-time 7-stage progress tracker (Contract Signed, DTP/Typesetting, Editorial, Cover Design, ISBN Allocation, Final Proof, Print & Release).",
      "Editorial Feedback: If an editor marks a manuscript as 'Needs Revision', detailed feedback appears directly on the author's card.",
      "Executed Contracts: Instant download and viewing of signed legal agreements.",
    ],
    linkHref: "/author",
    linkLabel: "Go to Author Portal →",
  },
  {
    id: "dtp-production-pipeline",
    sectionId: "production",
    sectionTitle: "DTP & Production Pipeline",
    badge: "Press",
    title: "Production Pipeline & Milestone Tracking",
    keywords: ["production", "dtp", "typesetting", "cover", "proof", "isbn", "print job", "press", "warehouse"],
    summary: "Every dual-signed contract seamlessly transitions into the active production pipeline across 6 milestones.",
    details: [
      "1. DTP & Typesetting: Malayalam font formatting, drop caps, page layout, and index styling.",
      "2. Cover Artwork: Front cover, spine width calculation, and back blurb layout.",
      "3. Galley Proofs: Proof copy generated for author review and corrections within a 14-day window.",
      "4. ISBN & Price Lock: Formal allocation from Raja Rammohun Roy National Agency and MRP lockdown.",
      "5. Print Batching & Press: Offset printing job assignment, paper weight specification, and binding.",
      "6. Pre-Press Completion: File seal and transition to physical offset press delivery.",
    ],
    linkHref: "/production",
    linkLabel: "Go to Production →",
  },
  {
    id: "flow-8b-post-production",
    sectionId: "production",
    sectionTitle: "DTP & Production Pipeline",
    badge: "Fulfillment",
    title: "Flow 8b: Post-Production Intake & BMS Handover",
    keywords: ["flow 8b", "post-production", "qc", "author copies", "warehouse", "stock in", "bms", "handover", "channels"],
    summary: "Comprehensive post-production intake, quality inspection, track-aware author copies segregation, and multi-channel sales handover.",
    details: [
      "Press Delivery & QC: Verification of physical print run, transit damages deduction, and QC sign-off.",
      "Track-Aware Author Copies: Earmarks complimentary copies for Kairali Books Publishing (default 10) or custom author share for Self-Publishing, with courier dispatch tracking.",
      "Warehouse Stock Inward: Net usable copies automatically inwarded to central warehouse inventory with immutable stock ledger audit rows.",
      "Multi-Channel Activation: Simultaneously releases title across Retail Bookstore, Dealer Network, Book Fairs, and Online Store.",
      "PMS to BMS Handover: Final milestone seal marking title published, active in catalog, and ready for commercial sale.",
    ],
    linkHref: "/production",
    linkLabel: "View Production Projects →",
  },
  {
    id: "team-staff-management",
    sectionId: "team",
    sectionTitle: "Team & Staff Management",
    badge: "Admin",
    title: "Staff Accounts, Passwords & Access Control",
    keywords: ["team", "staff", "admin", "users", "bcrypt", "deactivate", "password", "security"],
    summary: "Owners can manage staff members, assign roles, and revoke access instantly.",
    details: [
      "Add Member: Configure Full Name, Work Email, Temporary Password, and Role (Editor, Production, Owner, Accounts, Store).",
      "Password Security: Passwords salted and hashed with bcrypt (cost factor 12).",
      "Revocation: Deactivate staff instantly without deleting historical audit trails or past assignments.",
    ],
    linkHref: "/team",
    linkLabel: "Go to Team Management →",
  },
  {
    id: "test-accounts-reference",
    sectionId: "accounts",
    sectionTitle: "8. Live Test Accounts & Reference",
    badge: "Reference",
    title: "Cloud Test Accounts & Role Credentials",
    keywords: ["accounts", "test", "demo", "credentials", "login", "password", "roles", "email"],
    summary: "Pre-configured test accounts on the database to verify different departmental roles.",
    details: [
      "Owner: owner@kairalibooks.in / kairali123 (Full publisher access & payouts)",
      "Editor: editor@kairalibooks.in / kairali123 (Manuscript reviews, decisions & contracts)",
      "Production: press@kairalibooks.in / kairali123 (DTP, cover design & press pipelines)",
      "Accounts: accounts@kairalibooks.in / kairali123 (Commercial contracts & financial reports)",
      "Store: store@kairalibooks.in / kairali123 (Stock inventory & point-of-sale store receipts)",
    ],
    linkHref: "/login",
    linkLabel: "Go to Login →",
  },
];

export default function GuideClient({ currentUserRole }: { currentUserRole: string }) {
  const [activeTab, setActiveTab] = useState<SectionKey>("overview");
  const [search, setSearch] = useState("");

  const sections: { id: SectionKey; title: string; badge: string }[] = [
    { id: "overview", title: "System Overview & Roles", badge: "Core" },
    { id: "submissions", title: "Submissions & Editorial Review", badge: "Editorial" },
    { id: "contracts", title: "Commercial Terms & Contracts", badge: "Legal" },
    { id: "signing", title: "Digital Dual-Signing Workflow", badge: "Security" },
    { id: "author", title: "Author Portal & Activation", badge: "Author" },
    { id: "production", title: "DTP & Production Pipeline", badge: "Press" },
    { id: "team", title: "Team & Staff Management", badge: "Admin" },
    { id: "accounts", title: "Test Accounts & Quick Links", badge: "Reference" },
  ];

  // Filtered topics when searching
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return GUIDE_TOPICS.filter((topic) => {
      const matchTitle = topic.title.toLowerCase().includes(q);
      const matchSummary = topic.summary.toLowerCase().includes(q);
      const matchKeywords = topic.keywords.some((k) => k.toLowerCase().includes(q));
      const matchDetails = topic.details.some((d) => d.toLowerCase().includes(q));
      const matchSection = topic.sectionTitle.toLowerCase().includes(q);
      return matchTitle || matchSummary || matchKeywords || matchDetails || matchSection;
    });
  }, [search]);

  const isSearching = search.trim().length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 font-sans">
      {/* Header Banner */}
      <div className="rounded-3xl border border-black/10 bg-surface p-8 shadow-xs dark:border-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-bold   tracking-widest text-muted-foreground">
              Documentation &amp; Manual
            </span>
            <h1 className="mt-1 text-3xl  tracking-tight text-foreground ">
              Kairali PMS User Guide
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Operational workflows, role guidelines, and digital publishing procedures.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="apple-button inline-flex items-center gap-1.5 rounded-xl border border-[#7e2562]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#7e2562] shadow-2xs hover:bg-[#faedf5] hover:border-[#7e2562]/35 transition-all cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print / Save PDF</span>
            </button>
            <Link
              href={currentUserRole === "author" ? "/author" : "/dashboard"}
              className="apple-button inline-flex items-center gap-1.5 rounded-xl bg-[#7e2562] px-4 py-2.5 text-xs font-bold text-white shadow-plum-sm hover:bg-[#681d50] hover:shadow-plum transition-all cursor-pointer group"
            >
              <span>Back to Dashboard</span>
              <svg className="h-3.5 w-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Quick Search */}
        <div className="mt-6 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search topics (e.g. GST, Royalty, Digital Signing, Author Portal, Typesetting, Roles)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-black/12 bg-black/[0.02] pl-11 pr-10 py-3 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-foreground focus:bg-surface dark:border-white/15 dark:bg-white/[0.02]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* SEARCH RESULTS VIEW */}
      {isSearching ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground">
              Search Results for &ldquo;{search}&rdquo;
            </h2>
            <span className="text-xs font-bold text-muted-foreground">
              {searchResults.length} topic{searchResults.length === 1 ? "" : "s"} found
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="rounded-3xl border border-black/10 bg-surface p-12 text-center text-sm text-muted-foreground dark:border-white/10">
              <p className="text-base font-bold text-foreground">No documentation found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try searching for terms like &ldquo;Royalty&rdquo;, &ldquo;GST&rdquo;, &ldquo;Signing&rdquo;, &ldquo;Author&rdquo;, &ldquo;DTP&rdquo;, or &ldquo;Roles&rdquo;.
              </p>
              <button
                onClick={() => setSearch("")}
                className="apple-button mt-4 rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-black/10 bg-surface p-6 shadow-xs dark:border-white/10 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground   tracking-wider">
                        {item.sectionTitle}
                      </span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.summary}
                    </p>

                    <ul className="list-disc pl-4 space-y-1 text-xs text-foreground/80 leading-relaxed pt-1">
                      {item.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                    <button
                      onClick={() => {
                        setActiveTab(item.sectionId);
                        setSearch("");
                      }}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      View in {item.badge} Tab &rarr;
                    </button>
                    {item.linkHref && (
                      <Link
                        href={item.linkHref}
                        className="apple-button rounded-lg bg-foreground px-3 py-1 text-xs font-extrabold text-background shadow-xs hover:opacity-90"
                      >
                        {item.linkLabel || "Open Section →"}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD TABBED VIEW */
        <>
          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-black/[0.06] pb-3 dark:border-white/[0.08]">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveTab(sec.id)}
                className={`apple-button flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === sec.id
                    ? "bg-foreground text-background shadow-xs font-extrabold"
                    : "bg-surface text-muted-foreground hover:text-foreground border border-black/5 dark:border-white/10"
                }`}
              >
                <span>{sec.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    activeTab === sec.id
                      ? "bg-background/20 text-background"
                      : "bg-black/5 text-muted-foreground dark:bg-white/10"
                  }`}
                >
                  {sec.badge}
                </span>
              </button>
            ))}
          </div>

          {/* SECTION 1: System Overview & Roles */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-black/10 bg-surface p-8 space-y-6 dark:border-white/10">
                <h2 className="text-xl font-black text-foreground"> System Roles &amp; Capabilities</h2>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Kairali PMS is streamlined around active publishing roles to ensure smooth operational handoffs:
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black   text-foreground">Owner</span>
                      <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold text-foreground dark:bg-white/15">Full Access</span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      Overall publishing operations, commercial contract sealing, final price lock, team member management, and financial payouts.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black   text-foreground">Editor</span>
                      <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold text-foreground dark:bg-white/15">Editorial</span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      Manuscript review, author correspondence, submission decisions (Accept/Revise/Reject), and commercial terms configuration.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black   text-foreground">Production</span>
                      <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold text-foreground dark:bg-white/15">Press &amp; DTP</span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      DTP layout, cover design, galley proof approvals, printer coordination, and warehouse print receipt recording.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black   text-foreground">Author</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Portal</span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      Submit manuscripts, review editorial feedback, digitally execute contracts, and monitor real-time production stages.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Submissions & Public Tracking */}
          {activeTab === "submissions" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-black/10 bg-surface p-8 space-y-6 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-foreground"> Submissions &amp; Editorial Review</h2>
                  <Link
                    href="/submissions"
                    className="text-xs font-bold text-foreground underline hover:opacity-80"
                  >
                    Go to Submissions →
                  </Link>
                </div>

                <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
                    <h3 className="text-sm font-extrabold text-foreground">Author Manuscript Portal (`/publish/submit`)</h3>
                    <p className="text-xs text-muted-foreground">
                      Prospective authors visit <strong>/publish/submit</strong> to read submission guidelines and submit manuscripts online. Upon submission, they receive a tracking number (e.g. <code>SUB-2026-0001</code>) and instant tracking link.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
                    <h3 className="text-sm font-extrabold text-foreground">Editorial Decision Making</h3>
                    <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1.5">
                      <li>Open <strong>Submissions</strong> in the sidebar.</li>
                      <li>Click on any manuscript with <strong>Pending Review</strong> status.</li>
                      <li>Download and evaluate the manuscript file.</li>
                      <li>Click <strong>Submit Review Decision</strong>:
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li><strong>Accept</strong>: Opens contract parameter modal and queues author signing.</li>
                          <li><strong>Request Revision</strong>: Notifies author to update the manuscript and shows notes on their Author Dashboard.</li>
                          <li><strong>Reject</strong>: Sends formal editorial decline notice.</li>
                        </ul>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Commercial Terms & Contracts */}
          {activeTab === "contracts" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-black/10 bg-surface p-8 space-y-6 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-foreground">Commercial Terms &amp; Legal Structure</h2>
                  <Link
                    href="/contracts"
                    className="text-xs font-bold text-foreground underline hover:opacity-80"
                  >
                    Go to Contracts →
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-extrabold text-foreground text-sm block">Kairali Books Publishing Track</span>
                    <p className="text-muted-foreground leading-relaxed">
                      Kairali Books finances 100% of editing, typesetting, proofing, and printing.
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li><strong>Royalty %</strong>: Typically 10% to 15% on MRP.</li>
                      <li><strong>Advance (₹)</strong>: Non-refundable advance against royalties.</li>
                      <li><strong>Free Copies</strong>: 10 complimentary author copies.</li>
                      <li><strong>Author Discount</strong>: 40% discount on extra copies.</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-extrabold text-foreground text-sm block">Self-Publishing Track (Author-Assisted)</span>
                    <p className="text-muted-foreground leading-relaxed">
                      The author funds production services with full publisher distribution.
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li><strong>Package Fee (₹)</strong>: Custom service cost.</li>
                      <li><strong>GST (18%)</strong>: Automatically calculated on service fee.</li>
                      <li><strong>Distribution</strong>: Author receives agreed print quantity.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Digital Dual-Signing */}
          {activeTab === "signing" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-black/10 bg-surface p-8 space-y-6 dark:border-white/10">
                <h2 className="text-xl font-black text-foreground">Digital Dual-Signing Workflow</h2>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Agreements are digitally executed without paper, generating legally binding audit trails under the Indian IT Act:
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground text-background font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">Author Digital Signing (`/publish/contract/[id]`)</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Author clicks their secure link, reviews all 6 articles, inputs their PAN (for 194J TDS) and bank details, draws or types their signature, and checks the legal consent box.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground text-background font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">Publisher Digital Seal (`/contracts`)</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        In the PMS Contracts Dashboard, the publisher clicks <strong>Publisher Sign</strong> to affix the official digital seal. The agreement transitions to <strong>Dual-Signed</strong> and auto-enrolls in production.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground text-background font-bold text-xs">
                      3
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">Official A4 PDF Print (`/contracts/[id]/print`)</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Clicking <strong>Print / Save Official PDF</strong> opens the clean agreement formatted with Kairali Books letterhead, legal articles, and certified dual-signature verification stamps.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: Author Portal */}
          {activeTab === "author" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-black/10 bg-surface p-8 space-y-6 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-foreground">Author Portal &amp; Account Setup</h2>
                  <Link
                    href="/author"
                    className="text-xs font-bold text-foreground underline hover:opacity-80"
                  >
                    Go to Author Portal →
                  </Link>
                </div>

                <p className="text-sm text-foreground/80 leading-relaxed">
                  Authors have dedicated access to track submitted works, contracts, and production milestones:
                </p>

                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-extrabold text-foreground text-sm block">Account Setup &amp; Sign-In</span>
                    <p className="text-muted-foreground leading-relaxed">
                      After digitally signing a publishing agreement, authors receive an invitation to set up their password at <code>/author/setup</code>.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-extrabold text-foreground text-sm block">Real-Time Production Stepper</span>
                    <p className="text-muted-foreground leading-relaxed">
                      Authors can view real-time stage progress (DTP, Cover Design, ISBN Registration, Proofing, and Print Release) directly from their dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: Production Pipeline */}
          {activeTab === "production" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-black/10 bg-surface p-8 space-y-6 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-foreground">Production &amp; DTP Pipeline</h2>
                  <Link
                    href="/production"
                    className="text-xs font-bold text-foreground underline hover:opacity-80"
                  >
                    Go to Production →
                  </Link>
                </div>

                <p className="text-sm text-foreground/80 leading-relaxed">
                  Every signed contract moves automatically into the active production pipeline across 6 milestones:
                </p>

                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-bold text-foreground block">1. DTP &amp; Typesetting</span>
                    <span className="text-[11px] text-muted-foreground">Malayalam font formatting &amp; page styling</span>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-bold text-foreground block">2. Cover Design</span>
                    <span className="text-[11px] text-muted-foreground">Front, spine, and back cover layout</span>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-bold text-foreground block">3. Galley Proofs</span>
                    <span className="text-[11px] text-muted-foreground">14-day author correction window</span>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-bold text-foreground block">4. ISBN &amp; Price Lock</span>
                    <span className="text-[11px] text-muted-foreground">Raja Rammohun Roy ISBN allocation</span>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-bold text-foreground block">5. Press Batching</span>
                    <span className="text-[11px] text-muted-foreground">Offset print run &amp; binding order</span>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-bold text-foreground block">6. Stock Receipt</span>
                    <span className="text-[11px] text-muted-foreground">Warehouse inventory increment &amp; ledger audit</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: Team Management */}
          {activeTab === "team" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-black/10 bg-surface p-8 space-y-6 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-foreground">Team &amp; Staff Management</h2>
                  {currentUserRole === "owner" && (
                    <Link
                      href="/team"
                      className="text-xs font-bold text-foreground underline hover:opacity-80"
                    >
                      Go to Team →
                    </Link>
                  )}
                </div>

                <p className="text-sm text-foreground/80 leading-relaxed">
                  Owners can add, edit, or deactivate staff accounts from the <strong>Team</strong> section:
                </p>

                <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-2">
                  <li><strong>Add Member</strong>: Specify Full Name, Work Email, Temporary Password, and Role (<code>Editor</code>, <code>Production</code>, or <code>Owner</code>).</li>
                  <li><strong>Password Security</strong>: Passwords are automatically salted and hashed with bcrypt.</li>
                  <li><strong>Deactivation</strong>: Instantly revoke access without deleting historical audit logs.</li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 8: Test Accounts & Credentials */}
          {activeTab === "accounts" && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-black/10 bg-surface p-8 space-y-6 dark:border-white/10">
                <h2 className="text-xl font-black text-foreground">Live Cloud Test Accounts</h2>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Use these credentials to sign in and test different staff roles on the live Neon cloud database:
                </p>

                <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-black/[0.06] bg-black/[0.02] dark:border-white/[0.08] dark:bg-white/[0.02]">
                      <tr>
                        <th className="px-4 py-3 font-extrabold text-foreground">Role</th>
                        <th className="px-4 py-3 font-extrabold text-foreground">Email</th>
                        <th className="px-4 py-3 font-extrabold text-foreground">Password</th>
                        <th className="px-4 py-3 font-extrabold text-foreground">Access Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      <tr>
                        <td className="px-4 py-3 font-bold text-foreground">Owner</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">owner@kairalibooks.in</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">kairali123</td>
                        <td className="px-4 py-3 text-muted-foreground">Full Publisher Access</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-bold text-foreground">Editor</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">editor@kairalibooks.in</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">kairali123</td>
                        <td className="px-4 py-3 text-muted-foreground">Submissions &amp; Contracts</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-bold text-foreground">Production</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">press@kairalibooks.in</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">kairali123</td>
                        <td className="px-4 py-3 text-muted-foreground">Production Pipeline &amp; Press</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
