export type RevisionSeverity = "critical" | "major" | "minor" | "suggestion";

export interface RevisionSection {
  id: string;
  section: string;
  severity: RevisionSeverity;
  feedback: string;
}

export interface SectionRevisionData {
  type: "section_wise";
  overallSummary?: string;
  sections: RevisionSection[];
  createdAt?: string;
  authorNote?: string;
}

export const COMMON_BOOK_SECTIONS = [
  { label: "Book Title & Subtitle (ശീർഷകം / ഉപശീർഷകം)", value: "Book Title & Subtitle / ശീർഷകം", defaultSeverity: "minor" as RevisionSeverity },
  { label: "Cover Design & Visual Artwork (കവർ ഡിസൈൻ)", value: "Cover Design & Visual Artwork / കവർ ഡിസൈൻ", defaultSeverity: "minor" as RevisionSeverity },
  { label: "Introduction & Foreword (ആമുഖം / അവതാരിക)", value: "Introduction, Foreword & Preface / ആമുഖം & അവതാരിക", defaultSeverity: "major" as RevisionSeverity },
  { label: "Table of Contents & Structure (ഉള്ളടക്കം)", value: "Table of Contents & Structure / ഉള്ളടക്കക്രമം", defaultSeverity: "minor" as RevisionSeverity },
  { label: "Plot & Story Pacing (കഥാഗതി & ആഖ്യാനശൈലി)", value: "Plot & Story Pacing / കഥാഗതി & ആഖ്യാനശൈലി", defaultSeverity: "critical" as RevisionSeverity },
  { label: "Character Arc & Development (കഥാപാത്ര നിർമ്മിതി)", value: "Character Arc & Development / കഥാപാത്ര നിർമ്മിതി", defaultSeverity: "major" as RevisionSeverity },
  { label: "Language, Grammar & Style (ഭാഷാശുദ്ധി & വ്യാകരണം)", value: "Language, Grammar & Vocabulary / ഭാഷാശുദ്ധി & വ്യാകരണം", defaultSeverity: "major" as RevisionSeverity },
  { label: "Specific Chapters (നിർദ്ദിഷ്ട അധ്യായങ്ങൾ)", value: "Specific Chapters / നിർദ്ദിഷ്ട അധ്യായങ്ങൾ", defaultSeverity: "major" as RevisionSeverity },
  { label: "Conclusion & Epilogue (ഉപസംഹാരം / പിൻവാക്ക്)", value: "Conclusion & Epilogue / ഉപസംഹാരം & പിൻവാക്ക്", defaultSeverity: "major" as RevisionSeverity },
  { label: "References & Footnotes (കുറിപ്പുകൾ / റഫറൻസ്)", value: "References, Footnotes & Appendix / കുറിപ്പുകൾ", defaultSeverity: "minor" as RevisionSeverity },
  { label: "Formatting & Typesetting (ഫോർമാറ്റിംഗ്)", value: "Formatting & Manuscript Layout / ഫോർമാറ്റിംഗ്", defaultSeverity: "minor" as RevisionSeverity },
];

export function parseRevisionNotes(rawNotes: string | null | undefined): {
  isSectionWise: boolean;
  overallSummary: string;
  sections: RevisionSection[];
  raw: string;
} {
  if (!rawNotes || typeof rawNotes !== "string") {
    return {
      isSectionWise: false,
      overallSummary: "",
      sections: [],
      raw: "",
    };
  }

  const trimmed = rawNotes.trim();

  // Try parsing JSON structure
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === "section_wise" || Array.isArray(parsed.sections)) {
        const sections: RevisionSection[] = (parsed.sections || []).map((s: any, idx: number) => ({
          id: s.id || `sec-${idx}-${Date.now()}`,
          section: String(s.section || `Section ${idx + 1}`),
          severity: ["critical", "major", "minor", "suggestion"].includes(s.severity) ? s.severity : "major",
          feedback: String(s.feedback || s.notes || ""),
        }));

        return {
          isSectionWise: sections.length > 0,
          overallSummary: String(parsed.overallSummary || parsed.summary || ""),
          sections,
          raw: trimmed,
        };
      }
    } catch {
      // Not JSON, fallback to plain text
    }
  }

  return {
    isSectionWise: false,
    overallSummary: trimmed,
    sections: [],
    raw: trimmed,
  };
}

export function formatRevisionNotesAsPlainText(data: {
  overallSummary?: string;
  sections: RevisionSection[];
}): string {
  const parts: string[] = [];

  if (data.overallSummary && data.overallSummary.trim()) {
    parts.push(`[Overall Editorial Summary]:\n${data.overallSummary.trim()}`);
  }

  if (data.sections && data.sections.length > 0) {
    const sectionsText = data.sections
      .map((s, idx) => {
        const sevLabel = s.severity ? `[${s.severity.toUpperCase()}] ` : "";
        return `${idx + 1}. ${s.section} ${sevLabel}\n   ${s.feedback.trim()}`;
      })
      .join("\n\n");

    parts.push(`[Section-by-Section Revisions]:\n${sectionsText}`);
  }

  return parts.join("\n\n");
}
