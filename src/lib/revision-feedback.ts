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

export interface ParsedAuthorBrief {
  title: string;
  brief: string;
  version?: string;
  timestamp?: string;
}

export interface ParsedRevisionNotesResult {
  isSectionWise: boolean;
  overallSummary: string;
  sections: RevisionSection[];
  authorBriefs: ParsedAuthorBrief[];
  createdAt?: string;
  raw: string;
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

export function parseRevisionNotes(rawNotes: string | null | undefined): ParsedRevisionNotesResult {
  if (!rawNotes || typeof rawNotes !== "string") {
    return {
      isSectionWise: false,
      overallSummary: "",
      sections: [],
      authorBriefs: [],
      raw: "",
    };
  }

  const trimmed = rawNotes.trim();
  const authorBriefs: ParsedAuthorBrief[] = [];
  let editorFeedbackText = trimmed;

  // 1. Check for Author Revision Brief blocks: e.g. [Author Revision Brief - v2 - 2026-09-22 06:13:22]:\n<brief>
  const authorBriefRegex = /\[Author Revision Brief(?:[ -]+v?(\d+))?(?:[ -]+([^\]]+))?\]:?([\s\S]*?)(?=(?:\[Author Revision Brief|\[Previous Editor Feedback\]|$))/gi;
  let match;
  let hasAuthorBrief = false;

  while ((match = authorBriefRegex.exec(trimmed)) !== null) {
    hasAuthorBrief = true;
    const version = match[1]?.trim();
    const timestamp = match[2]?.trim();
    const briefContent = match[3]?.trim();

    if (briefContent) {
      let title = "Author Revision Brief";
      if (version) title += ` (v${version})`;
      if (timestamp) title += ` · ${timestamp}`;
      authorBriefs.push({
        title,
        brief: briefContent,
        version,
        timestamp,
      });
    }
  }

  // 2. Extract Previous Editor Feedback section if delimited
  const prevFeedbackMarker = /\[Previous Editor Feedback\]:?/i;
  if (prevFeedbackMarker.test(trimmed)) {
    const parts = trimmed.split(prevFeedbackMarker);
    if (parts.length > 1) {
      editorFeedbackText = parts[parts.length - 1].trim();
    }
  } else if (hasAuthorBrief) {
    editorFeedbackText = trimmed.replace(authorBriefRegex, "").trim();
  }

  // Helper to parse a JSON object
  function tryParseJson(str: string): { isSectionWise: boolean; overallSummary: string; sections: RevisionSection[]; createdAt?: string } | null {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === "object") {
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
            createdAt: parsed.createdAt ? String(parsed.createdAt) : undefined,
          };
        } else if (parsed.overallSummary || parsed.summary || parsed.feedback || parsed.notes || parsed.message) {
          return {
            isSectionWise: false,
            overallSummary: String(parsed.overallSummary || parsed.summary || parsed.feedback || parsed.notes || parsed.message || ""),
            sections: [],
            createdAt: parsed.createdAt ? String(parsed.createdAt) : undefined,
          };
        }
      }
    } catch {
      // not JSON
    }
    return null;
  }

  // Check if editorFeedbackText is JSON directly
  const directJson = tryParseJson(editorFeedbackText);
  if (directJson) {
    return {
      ...directJson,
      authorBriefs,
      raw: trimmed,
    };
  }

  // Check if there is an embedded JSON block with "section_wise"
  const jsonMatch = editorFeedbackText.match(/(\{[\s\S]*"type"\s*:\s*"section_wise"[\s\S]*\})/);
  if (jsonMatch) {
    const embeddedJson = tryParseJson(jsonMatch[1]);
    if (embeddedJson) {
      return {
        ...embeddedJson,
        authorBriefs,
        raw: trimmed,
      };
    }
  }

  // Check any generic embedded JSON object with sections / overallSummary
  const genericJsonMatch = editorFeedbackText.match(/(\{[\s\S]*"(?:sections|overallSummary|feedback)"[\s\S]*\})/);
  if (genericJsonMatch) {
    const embeddedJson = tryParseJson(genericJsonMatch[1]);
    if (embeddedJson) {
      return {
        ...embeddedJson,
        authorBriefs,
        raw: trimmed,
      };
    }
  }

  // If text is "None" or empty
  if (editorFeedbackText.toLowerCase() === "none" || !editorFeedbackText.trim()) {
    return {
      isSectionWise: false,
      overallSummary: "",
      sections: [],
      authorBriefs,
      raw: trimmed,
    };
  }

  return {
    isSectionWise: false,
    overallSummary: editorFeedbackText,
    sections: [],
    authorBriefs,
    raw: trimmed,
  };
}

export function formatRevisionNotesAsPlainText(data: {
  overallSummary?: string;
  sections?: RevisionSection[];
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
