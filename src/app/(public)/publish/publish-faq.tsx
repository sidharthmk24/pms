"use client";

import { useState } from "react";
import AnimatedSection from "@/components/animated-section";
import { Plus, Minus } from "lucide-react";

interface PublishFaqProps {
  weeks: number;
  maxMb: number;
}

interface FaqItem {
  id: string;
  question: string;
  paragraphs: string[];
}

export default function PublishFaq({ weeks, maxMb }: PublishFaqProps) {
  // Only one open item at a time
  const [openId, setOpenId] = useState<string | null>("faq-timeline");

  const faqs: FaqItem[] = [
    {
      id: "faq-timeline",
      question: "How long does editorial peer evaluation take?",
      paragraphs: [
        `Our senior editorial board completes an in-depth review of every submitted manuscript within ${weeks} weeks. You receive automated status notifications at each review milestone (Intake Screening, Peer Evaluation, and Editorial Board Decision).`,
        `Preliminary screening takes 3–5 business days, after which full manuscripts are assigned to genre-specialist reviewers. You can also track real-time progress at any time using your unique submission reference ID.`,
      ],
    },
    {
      id: "faq-fees",
      question: "Are there any reading, submission, or evaluation fees?",
      paragraphs: [
        "No. Kairali Books charges absolutely ₹0 in reading, review, or submission fees. We believe literary discovery should never be paywalled or monetized at the intake stage.",
        "Manuscripts are evaluated strictly on literary vitality, thematic depth, narrative craft, and cultural resonance. We do not operate vanity publishing or paid inclusion schemes.",
      ],
    },
    {
      id: "faq-specs",
      question: "What file formats, file size limits, and script typing are supported?",
      paragraphs: [
        `We accept complete digital drafts in PDF, Microsoft Word (.doc, .docx), and OpenDocument (.odt) formats up to ${maxMb} MB in file size.`,
        "Both Malayalam (Unicode, InScript, Google Malayalam IME, and legacy ISM converted) and English manuscripts are warmly supported. We also accept scanned handwritten drafts for senior literary figures by special arrangement.",
      ],
    },
    {
      id: "faq-royalties",
      question: "Do authors retain copyright, and how are royalties paid?",
      paragraphs: [
        "Yes. Authors retain 100% of their intellectual copyright and moral rights. Kairali Books enters into an exclusive publishing license for agreed editions.",
        "Upon acceptance, we execute a transparent, legally binding digital contract specifying fair royalty percentages on physical bookstore sales, digital e-books, and library subscriptions, disbursed with semi-annual audited accounting statements.",
      ],
    },
    {
      id: "faq-distribution",
      question: "How are published books distributed across Kerala and nationally?",
      paragraphs: [
        "We maintain direct wholesale supply partnerships with prominent bookstore chains and independent bookshops across all 14 districts of Kerala.",
        "In addition, all accepted works are showcased at major literary festivals (including Kerala Literature Festival and Mathrubhumi International Festival of Letters), state book fairs, and leading digital retail platforms with statewide delivery.",
      ],
    },
    {
      id: "faq-rights",
      question: "Translation & International Rights",
      paragraphs: [
        "Malayalam has stories the rest of the world hasn't read yet. Select titles across our catalog, spanning novels, poetry, short story collections, and memoirs, are open for translation licensing, with priority generally going to works that have already found strong readership or critical recognition.",
        "We collaborate with accredited literary translators, cultural agencies, and overseas publishing partners to ensure the tone, cultural texture, and narrative depth of the original work are faithfully preserved.",
      ],
    },
    {
      id: "faq-unfinished",
      question: "Can I submit an unfinished manuscript or sample chapters?",
      paragraphs: [
        "For novels, short story collections, and poetry anthologies, we require a completed draft to properly evaluate thematic coherence, character development, and narrative cadence.",
        "For academic research, cultural essays, memoirs, or authorized translations, you may submit a detailed chapter-wise synopsis alongside the first 3 sample chapters.",
      ],
    },
    {
      id: "faq-production",
      question: "What are the exact production steps after acceptance?",
      paragraphs: [
        "Once formally accepted, your manuscript enters our collaborative publishing pipeline: comprehensive structural copyediting, professional Malayalam typography & typesetting, bespoke cover art design, official ISBN allotment, author galley proof approval, physical print run, and press release announcement.",
        "Authors are actively consulted throughout the typesetting and cover design stages to ensure the published volume accurately reflects their artistic vision.",
      ],
    },
  ];

  function toggleFaq(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <AnimatedSection id="faq" animation="fade-up" delayMs={50} className="mb-24 scroll-mt-20">
      {/* ── Section Header ─────────────────────────────────────── */}
      <div className="mb-8 sm:mb-10 text-center lg:text-left">
        
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2B1B24]">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-sm sm:text-base text-neutral-600 max-w-2xl font-normal">
          Clear and transparent guidelines on our evaluation timeline, zero reading fees, author copyright, and statewide distribution.
        </p>
      </div>

      {/* ── Accordion Container ─────────────────────────────────── */}
      <div className="w-full border border-[#d8c8d3] bg-white divide-y divide-[#d8c8d3] shadow-xs">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;

          return (
            <div
              key={faq.id}
              id={faq.id}
              className={`transition-colors duration-300 ease-in-out ${
                isOpen ? "bg-[#f8f2f6]" : "bg-white hover:bg-[#faf6f9]/60"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleFaq(faq.id)}
                className="w-full flex items-center justify-between p-6 sm:p-8 text-left cursor-pointer select-none group"
                aria-expanded={isOpen}
              >
                <span className="text-xl sm:text-2xl font-semibold text-[#1e1e1e] tracking-tight pr-6">
                  {faq.question}
                </span>

                <span className="shrink-0 text-[#7e2562] flex items-center justify-center">
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <Minus
                      className={`w-6 h-6 stroke-[1.75] absolute inset-0 transition-all duration-300 ease-in-out ${
                        isOpen
                          ? "opacity-100 rotate-0 scale-100"
                          : "opacity-0 -rotate-90 scale-75 pointer-events-none"
                      }`}
                    />
                    <Plus
                      className={`w-6 h-6 stroke-[1.75] absolute inset-0 transition-all duration-300 ease-in-out ${
                        isOpen
                          ? "opacity-0 rotate-90 scale-75 pointer-events-none"
                          : "opacity-100 rotate-0 scale-100"
                      }`}
                    />
                  </div>
                </span>
              </button>

              {/* Smooth Animated Accordion Height Container */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-6 sm:px-8 pb-8 pt-0 text-sm sm:text-base text-[#4a4a4a] leading-relaxed space-y-4">
                    {faq.paragraphs.map((p, idx) => (
                      <p key={idx} className="font-normal">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AnimatedSection>
  );
}
