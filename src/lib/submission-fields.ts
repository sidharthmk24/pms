/**
 * Shared, isomorphic field definitions for the manuscript submission form.
 *
 * Deliberately free of `server-only` and of any database import: the public
 * client form and the server route both consume this, so validation rules
 * cannot drift between what the author sees and what the API enforces.
 */
import { z } from "zod";

export const GENRES = [
  { value: "novel", en: "Novel", ml: "നോവൽ" },
  { value: "short_stories", en: "Short stories", ml: "ചെറുകഥ" },
  { value: "poetry", en: "Poetry", ml: "കവിത" },
  { value: "essays", en: "Essays / Non-fiction", ml: "ലേഖനം" },
  { value: "biography", en: "Biography / Memoir", ml: "ജീവചരിത്രം" },
  { value: "childrens", en: "Children's literature", ml: "ബാലസാഹിത്യം" },
  { value: "translation", en: "Translation", ml: "വിവർത്തനം" },
  { value: "drama", en: "Drama", ml: "നാടകം" },
  { value: "travelogue", en: "Travelogue", ml: "യാത്രാവിവരണം" },
  { value: "academic", en: "Academic / Reference", ml: "അക്കാദമികം" },
  { value: "other", en: "Other", ml: "മറ്റുള്ളവ" },
] as const;

export const GENRE_VALUES = GENRES.map((g) => g.value);

export const LANGUAGES = [
  { value: "Malayalam", en: "Malayalam", ml: "മലയാളം" },
  { value: "English", en: "English", ml: "ഇംഗ്ലീഷ്" },
  { value: "Other", en: "Other", ml: "മറ്റുള്ളവ" },
] as const;

export function genreLabel(value: string): string {
  return GENRES.find((g) => g.value === value)?.en ?? value;
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / 1024 / 1024;
export const ACCEPT_ATTR = ".pdf,.doc,.docx,.odt";
export const ALLOWED_LABEL = "PDF, DOC, DOCX or ODT";
export const SYNOPSIS_MIN = 100;
export const SYNOPSIS_MAX = 5000;

export const SubmissionSchema = z.object({
  author_name: z.string().trim().min(2, "Please enter your full name").max(120),
  author_name_ml: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address").max(160),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{6,20}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  place: z.string().trim().max(120).optional().or(z.literal("")),
  title: z.string().trim().min(2, "Please enter the manuscript title").max(200),
  title_ml: z.string().trim().max(200).optional().or(z.literal("")),
  genre: z.enum(GENRE_VALUES as unknown as [string, ...string[]], { message: "Please choose a genre" }),
  language: z.enum(["Malayalam", "English", "Other"]).default("Malayalam"),
  synopsis: z
    .string()
    .trim()
    .min(SYNOPSIS_MIN, `Please write at least ${SYNOPSIS_MIN} characters so our editors can assess the work`)
    .max(SYNOPSIS_MAX, `Please keep the synopsis under ${SYNOPSIS_MAX} characters`),
});

export type SubmissionInput = z.infer<typeof SubmissionSchema>;
