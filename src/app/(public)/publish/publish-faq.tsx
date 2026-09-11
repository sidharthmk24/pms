"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AnimatedSection from "@/components/animated-section";
import {
  Search,
  ChevronDown,
  HelpCircle,
  Check,
  Copy,
  Sparkles,
  MessageSquare,
  ArrowRight,
  X,
  ExternalLink,
  Mail,
} from "lucide-react";

interface PublishFaqProps {
  weeks: number;
  maxMb: number;
}

interface FaqItem {
  id: string;
  category: "timeline" | "royalties" | "specs" | "distribution";
  categoryLabel: string;
  q: string;
  qMl?: string;
  a: string;
  takeaway: string;
}

const CATEGORIES = [
  { id: "all", label: "All Inquiries" },
  { id: "timeline", label: "Timeline & Review" },
  { id: "royalties", label: "Costs & Royalties" },
  { id: "specs", label: "Formats & Specs" },
  { id: "distribution", label: "Distribution & Reach" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

export default function PublishFaq({ weeks, maxMb }: PublishFaqProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  // By default, open the first 2 questions so the grid looks vibrant immediately
  const [openIds, setOpenIds] = useState<Set<string>>(
    new Set(["faq-timeline", "faq-fees"])
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, "yes" | "no">>({});

  const faqs: FaqItem[] = useMemo(
    () => [
      {
        id: "faq-timeline",
        category: "timeline",
        categoryLabel: "Timeline & Review",
        q: "How long does editorial peer evaluation take?",
        qMl: "മാനുസ്ക്രിപ്റ്റ് അവലോകനത്തിന് എത്ര സമയമെടുക്കും?",
        a: `Our senior editorial board completes an in-depth review of every submitted manuscript within ${weeks} weeks. You receive automated status notifications at each review milestone (Intake Screening, Peer Evaluation, and Editorial Board Decision). You can also track real-time progress using your unique reference ID.`,
        takeaway: `3–5 business days preliminary screening · Final decision within ${weeks} weeks`,
      },
      {
        id: "faq-fees",
        category: "royalties",
        categoryLabel: "Costs & Royalties",
        q: "Are there any reading, submission, or evaluation fees?",
        qMl: "മാനുസ്ക്രിപ്റ്റ് സമർപ്പിക്കുന്നതിന് എന്തെങ്കിലും ഫീസ് ഉണ്ടോ?",
        a: "No. Kairali Books charges absolutely ₹0 in reading, review, or submission fees. We believe literary discovery should never be paywalled. Manuscripts are evaluated strictly on literary vitality, thematic depth, narrative craft, and cultural resonance.",
        takeaway: "100% Free Submission · No hidden or vanity publishing charges",
      },
      {
        id: "faq-specs",
        category: "specs",
        categoryLabel: "Formats & Specs",
        q: "What file formats, file size limits, and script typing are supported?",
        qMl: "ഏതൊക്കെ ഫയൽ ഫോർമാറ്റുകളും ഫോണ്ടുകളുമാണ് സ്വീകരിക്കുന്നത്?",
        a: `We accept complete digital drafts in PDF, Microsoft Word (.doc, .docx), and OpenDocument (.odt) formats up to ${maxMb} MB. Both Malayalam (Unicode / InScript / Google Malayalam IME / ISM converted) and English manuscripts are warmly supported. We also accept scanned handwritten drafts for senior literary figures by special arrangement.`,
        takeaway: `PDF, DOC, DOCX, ODT up to ${maxMb}MB · Unicode Malayalam compatible`,
      },
      {
        id: "faq-royalties",
        category: "royalties",
        categoryLabel: "Costs & Royalties",
        q: "Do authors retain copyright, and how are royalties paid?",
        qMl: "പകർപ്പവകാശവും റോയൽറ്റിയും എങ്ങനെയാണ് നിശ്ചയിക്കുന്നത്?",
        a: "Yes. Authors retain 100% of their intellectual copyright and moral rights. Upon acceptance, we execute a transparent, legally binding digital contract specifying fair royalty percentages on physical bookstore sales, digital e-books, and library subscriptions, disbursed with semi-annual audited accounting statements.",
        takeaway: "100% author copyright retained · Semi-annual royalty payouts & statements",
      },
      {
        id: "faq-distribution",
        category: "distribution",
        categoryLabel: "Distribution & Reach",
        q: "How are published books distributed across Kerala and nationally?",
        qMl: "പുസ്തക വിതരണം എങ്ങനെയാണ് നടപ്പിലാക്കുന്നത്?",
        a: "We maintain direct wholesale supply partnerships with prominent bookstore chains and independent bookshops across all 14 districts of Kerala. In addition, all accepted works are showcased at major literary festivals (including Kerala Literature Festival and Mathrubhumi International Festival of Letters), state book fairs, and leading digital retail platforms with statewide delivery.",
        takeaway: "Direct distribution in all 14 districts · Literary fests & online retail",
      },
      {
        id: "faq-unfinished",
        category: "specs",
        categoryLabel: "Formats & Specs",
        q: "Can I submit an unfinished manuscript or sample chapters?",
        qMl: "പൂർത്തിയാകാത്ത രചനകളോ സാമ്പിൾ അധ്യായങ്ങളോ അയക്കാമോ?",
        a: "For novels, short story collections, and poetry anthologies, we require a completed draft to properly evaluate thematic coherence and narrative cadence. For academic research, cultural essays, memoirs, or authorized translations, you may submit a detailed chapter-wise synopsis alongside the first 3 sample chapters.",
        takeaway: "Completed draft for fiction/poetry · Synopsis + 3 sample chapters for non-fiction",
      },
      {
        id: "faq-production",
        category: "timeline",
        categoryLabel: "Timeline & Review",
        q: "What are the exact production steps after acceptance?",
        qMl: "തിരഞ്ഞെടുക്കപ്പെട്ട ശേഷം തുടർന്നുള്ള ഘട്ടങ്ങൾ എന്തൊക്കെയാണ്?",
        a: "Once formally accepted, your manuscript enters our collaborative publishing pipeline: comprehensive structural copyediting, professional Malayalam typography & typesetting, bespoke cover art design, official ISBN allotment, author galley proof approval, physical print run, and press release announcement.",
        takeaway: "Copyediting → Typography → Bespoke Cover Art → Proof Approval → Print Launch",
      },
    ],
    [weeks, maxMb]
  );

  // Filtered FAQs based on category and search query
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory =
        activeCategory === "all" || faq.category === activeCategory;
      const qLower = searchQuery.toLowerCase().trim();
      if (!qLower) return matchesCategory;

      const matchesSearch =
        faq.q.toLowerCase().includes(qLower) ||
        faq.a.toLowerCase().includes(qLower) ||
        faq.takeaway.toLowerCase().includes(qLower) ||
        (faq.qMl && faq.qMl.toLowerCase().includes(qLower)) ||
        faq.categoryLabel.toLowerCase().includes(qLower);

      return matchesCategory && matchesSearch;
    });
  }, [faqs, activeCategory, searchQuery]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: faqs.length };
    faqs.forEach((faq) => {
      counts[faq.category] = (counts[faq.category] || 0) + 1;
    });
    return counts;
  }, [faqs]);

  function toggleFaq(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function expandAll() {
    setOpenIds(new Set(filteredFaqs.map((f) => f.id)));
  }

  function collapseAll() {
    setOpenIds(new Set());
  }

  function handleCopyQuestion(faq: FaqItem) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/publish#${faq.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(faq.id);
      setTimeout(() => setCopiedId(null), 2200);
    });
  }

  function handleCopyEmail() {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText("submissions@kairalibooks.com").then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2200);
    });
  }

  function handleFeedback(id: string, value: "yes" | "no") {
    setFeedback((prev) => ({ ...prev, [id]: value }));
  }

  const allExpanded =
    filteredFaqs.length > 0 && filteredFaqs.every((f) => openIds.has(f.id));

  return (
    <AnimatedSection id="faq" animation="fade-up" delayMs={50} className="mb-24 scroll-mt-20">
      {/* ── 1. Centered Section Header ───────────────────────────────── */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-3 px-4">
        <div className="inline-flex items-center gap-2 rounded-sm border border-[#7e2562]/20 bg-[#faedf5] px-3.5 py-1 text-xs font-bold text-[#7e2562] shadow-2xs">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Author Knowledge Base & FAQ</span>
        </div>

        <h2 className="text-3xl sm:text-5xl  font-bold text-[#2B1B24] tracking-tight">
          Everything Authors Ask.
        </h2>

        <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-normal max-w-2xl mx-auto">
          Transparent guidelines on our {weeks}-week peer review turnaround, zero reading fees, 100% retained copyright, and statewide distribution network.
        </p>
      </div>

      {/* ── 2. Interactive Control Toolbar ───────────────────────────── */}
      <div className="space-y-4 mb-8">
        {/* Category Pills Bar (Horizontal Scroll / Wrap) */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`apple-button inline-flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#7e2562] text-white shadow-sm shadow-[#7e2562]/20 border border-[#7e2562]"
                    : "bg-white border border-neutral-200 text-[#2B1B24] hover:bg-[#faf5f8] hover:border-[#7e2562]/30"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar & Global Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto px-2">
          {/* Search Box */}
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g., royalties, formats, timeline)..."
              className="w-full pl-9 pr-8 py-2.5 rounded-sm border border-neutral-200 bg-white text-xs sm:text-sm text-[#2B1B24] placeholder:text-neutral-400 focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/15 outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Result counter & Expand All */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-4 text-xs">
            <span className="text-neutral-500 font-medium">
              Showing <strong className="text-[#7e2562]">{filteredFaqs.length}</strong> of {faqs.length} questions
            </span>

            <button
              type="button"
              onClick={allExpanded ? collapseAll : expandAll}
              className="apple-button px-3 py-1.5 rounded-sm border border-[#7e2562]/20 bg-white hover:bg-[#faf5f8] text-xs font-bold text-[#7e2562] transition-colors cursor-pointer shrink-0"
            >
              {allExpanded ? "Collapse All" : "Expand All"}
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Responsive 2-Column Grid of Interactive Cards ──────────── */}
      {filteredFaqs.length === 0 ? (
        <div className="p-12 text-center rounded-sm border border-dashed border-neutral-300 bg-white max-w-2xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-sm bg-[#faf5f8] text-[#7e2562] flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#2B1B24]">No matching questions found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            We couldn&apos;t find an inquiry matching &ldquo;{searchQuery}&rdquo;. Try another keyword or reach out directly to our editors below.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="apple-button px-5 py-2.5 rounded-sm bg-[#7e2562] text-white text-xs font-bold shadow-2xs hover:bg-[#681b50] transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-start">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIds.has(faq.id);
            const isCopied = copiedId === faq.id;
            const itemFeedback = feedback[faq.id];

            return (
              <div
                key={faq.id}
                id={faq.id}
                className={`group rounded-sm border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "border-[#7e2562]/35 bg-white shadow-md shadow-[#7e2562]/5 ring-1 ring-[#7e2562]/10"
                    : "border-neutral-200 bg-white hover:border-[#7e2562]/30 hover:shadow-sm"
                }`}
              >
                {/* Accordion Trigger Header */}
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full text-left p-5 flex flex-col justify-between cursor-pointer select-none transition-colors space-y-3"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center justify-between gap-3 w-full">
                    {/* Number and Category */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-sm text-[11px] font-mono font-bold transition-colors ${
                          isOpen
                            ? "bg-[#7e2562] text-white shadow-2xs"
                            : "bg-[#faf5f8] text-[#7e2562] border border-[#7e2562]/15 group-hover:bg-[#7e2562]/10"
                        }`}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
{/* 
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7e2562] bg-[#faedf5] px-2 py-0.5 rounded-sm border border-[#7e2562]/15">
                        {faq.categoryLabel}
                      </span> */}
                    </div>

                    {/* Chevron icon indicator */}
                    <div
                      className={`w-6 h-6 rounded-sm flex items-center justify-center shrink-0 border transition-all duration-300 ${
                        isOpen
                          ? "bg-[#7e2562] border-[#7e2562] text-white rotate-180 shadow-2xs"
                          : "bg-[#faf5f8] border-[#7e2562]/15 text-[#7e2562] group-hover:bg-[#7e2562]/10"
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Question headline */}
                  <div>
                    <h3
                      className={`text-sm sm:text-base font-bold leading-snug transition-colors ${
                        isOpen
                          ? "text-[#7e2562]"
                          : "text-[#2B1B24] group-hover:text-[#7e2562]"
                      }`}
                    >
                      {faq.q}
                    </h3>
                    {faq.qMl && (
                      <p className="font-ml text-xs text-neutral-400 mt-1 leading-normal">
                        {faq.qMl}
                      </p>
                    )}
                  </div>
                </button>

                {/* Accordion Content Body */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-2 border-t border-neutral-100 bg-[#fdfbfd] space-y-4 animate-in fade-in-50 duration-200">
                    {/* Narrative answer */}
                    <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal">
                      {faq.a}
                    </p>

                    {/* Key Takeaway Pill */}
                    <div className="rounded-sm bg-[#faf5f8] border border-[#7e2562]/15 p-3 flex items-start gap-2.5 text-xs text-[#7e2562] font-semibold">
                      <Sparkles className="w-4 h-4 shrink-0 text-[#7e2562] mt-0.5" />
                      <div>
                        <span className="uppercase text-[10px] tracking-wider font-extrabold text-[#7e2562]/80 block mb-0.5">
                          Key Takeaway
                        </span>
                        <span className="text-neutral-800 font-medium">
                          {faq.takeaway}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Strip: Feedback & Copy Link */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-neutral-100">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <span>Helpful?</span>
                        {itemFeedback ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                            <Check className="w-3 h-3" />
                            <span>Thanks!</span>
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleFeedback(faq.id, "yes")}
                              className="apple-button px-2 py-0.5 rounded-sm border border-neutral-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 font-semibold text-neutral-600 transition-colors cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFeedback(faq.id, "no")}
                              className="apple-button px-2 py-0.5 rounded-sm border border-neutral-200 bg-white hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 font-semibold text-neutral-600 transition-colors cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyQuestion(faq)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-[#7e2562] transition-colors cursor-pointer"
                        title="Copy direct link to this answer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Link Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. Bottom Editorial Desk Support Strip ─────────────────────── */}
      <div className="mt-10 rounded-sm border border-[#7e2562]/15 bg-gradient-to-r from-[#faf5f8] via-white to-[#faf5f8] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-start gap-4 max-w-xl">
          <div className="w-10 h-10 rounded-sm bg-[#7e2562] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#7e2562]/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-[#2B1B24]">
              Have an unlisted inquiry about your work?
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Our senior editorial committee evaluates submissions and author queries daily. Email us directly or submit your manuscript today.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleCopyEmail}
            className="apple-button w-full sm:w-auto px-4 py-2.5 rounded-sm border border-[#7e2562]/25 bg-white text-xs font-bold text-[#7e2562] hover:bg-[#faedf5] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            {copiedEmail ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Email Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>submissions@kairalibooks.com</span>
              </>
            )}
          </button>

          <a
            href="mailto:submissions@kairalibooks.com?subject=Author%20Inquiry%20%E2%80%94%20Kairali%20Books"
            className="apple-button w-full sm:w-auto px-5 py-2.5 rounded-sm bg-[#7e2562] text-white text-xs font-bold hover:bg-[#681b50] shadow-sm shadow-[#7e2562]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Send Email</span>
          </a>
        </div>
      </div>
    </AnimatedSection>
  );
}
