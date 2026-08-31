"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { GENRES, LANGUAGES } from "@/lib/submission-fields";

const ACCEPT = ".pdf,.doc,.docx,.odt";
const MAX_MB = 25;
const SYNOPSIS_MIN = 100;

type FieldErrors = Record<string, string>;

export default function SubmissionForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [synopsis, setSynopsis] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    setPending(true);

    try {
      const res = await fetch("/api/public/submissions", {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      const body = await res.json();

      if (!res.ok || !body.ok) {
        if (Array.isArray(body?.issues)) {
          const next: FieldErrors = {};
          for (const issue of body.issues) next[issue.path] = issue.message;
          setErrors(next);
          setFormError("Please correct the highlighted fields.");
          const first = document.getElementById(body.issues[0]?.path);
          first?.scrollIntoView({ behavior: "smooth", block: "center" });
          (first as HTMLElement | null)?.focus?.();
        } else {
          setFormError(body?.error ?? "We could not accept the submission. Please try again.");
        }
        setPending(false);
        return;
      }

      const params = new URLSearchParams({
        ref: body.data.refNo,
        weeks: String(body.data.responseWeeks),
      });
      router.push(`/publish/submitted?${params}`);
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  const synopsisShort = synopsis.trim().length > 0 && synopsis.trim().length < SYNOPSIS_MIN;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-8">
      <fieldset disabled={pending} className="space-y-8">
        {/* Section 1: Author Details */}
        <section className="rounded-[24px] border border-black/[0.08] bg-surface/90 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">
              1
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Author Information</h2>
              <p className="text-sm text-muted-foreground">How our editorial team can contact you</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full Name" name="author_name" required error={errors.author_name} className="sm:col-span-2" placeholder="e.g. A. R. Rahman" />
            <Field label="Email Address" name="email" type="email" required error={errors.email} hint="We will send correspondence here" placeholder="author@example.com" />
            <Field label="Phone Number" name="phone" type="tel" error={errors.phone} hint="Optional for WhatsApp / calling" placeholder="+91 98765 43210" />
            <Field label="Town / District" name="place" error={errors.place} hint="Optional (e.g. Kozhikode, Thrissur)" placeholder="e.g. Kozhikode" className="sm:col-span-2" />
          </div>
        </section>

        {/* Section 2: Manuscript Details */}
        <section className="rounded-[24px] border border-black/[0.08] bg-surface/90 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-surface/80 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">
              2
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Manuscript Details</h2>
              <p className="text-sm text-muted-foreground">Genre, synopsis, and document upload</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Book Title" name="title" required error={errors.title} className="sm:col-span-2" placeholder="Title of your book" />

            <div>
              <Label htmlFor="genre" required>Genre</Label>
              <div className="relative flex items-center">
                <select
                  id="genre"
                  name="genre"
                  defaultValue=""
                  className="apple-button w-full appearance-none rounded-xl border border-black/15 bg-background/90 py-3 pl-4 pr-9 text-base font-semibold text-foreground outline-none transition-colors hover:border-black/30 focus:border-foreground dark:border-white/15 dark:bg-surface-muted/80 dark:hover:border-white/30"
                >
                  <option value="" disabled>Choose a genre…</option>
                  {GENRES.map((g) => (
                    <option key={g.value} value={g.value}>{g.en}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 flex items-center text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <ErrorText message={errors.genre} />
            </div>

            <div>
              <Label htmlFor="language">Language</Label>
              <div className="relative flex items-center">
                <select
                  id="language"
                  name="language"
                  defaultValue="Malayalam"
                  className="apple-button w-full appearance-none rounded-xl border border-black/15 bg-background/90 py-3 pl-4 pr-9 text-base font-semibold text-foreground outline-none transition-colors hover:border-black/30 focus:border-foreground dark:border-white/15 dark:bg-surface-muted/80 dark:hover:border-white/30"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.en}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 flex items-center text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <ErrorText message={errors.language} />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="synopsis" required>Synopsis</Label>
              <textarea
                id="synopsis"
                name="synopsis"
                rows={6}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="What is the book about? Who is it for? Key characters, plot outline, and any previous publications or awards."
                className="w-full rounded-2xl border border-black/15 bg-background/90 p-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground dark:border-white/15 dark:bg-surface-muted/80"
              />
              <div className="mt-1.5 flex justify-between text-xs">
                <ErrorText
                  message={errors.synopsis ?? (synopsisShort ? `${SYNOPSIS_MIN - synopsis.trim().length} more characters needed` : undefined)}
                />
                <span className="numeric font-medium text-muted-foreground">{synopsis.trim().length} / {SYNOPSIS_MIN} min</span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="manuscript" required>Manuscript File</Label>
              <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/15 bg-black/[0.02] p-6 transition-colors hover:border-black/30 dark:border-white/15 dark:bg-white/[0.02]">
                <svg className="mb-2 h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <input
                  id="manuscript"
                  name="manuscript"
                  type="file"
                  accept={ACCEPT}
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                  className="w-full text-center text-sm font-semibold file:mr-4 file:rounded-xl file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-xs file:font-bold file:text-background"
                />
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  {fileName ? `✓ Selected: ${fileName}` : `Supported: PDF, DOC, DOCX or ODT · Max ${MAX_MB} MB`}
                </p>
              </div>
              <ErrorText message={errors.manuscript} />
            </div>
          </div>
        </section>

        {/* Honeypot */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {formError && (
          <div role="alert" className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">
            {formError}
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <button
            type="submit"
            disabled={pending}
            className="apple-button inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-md hover:bg-primary-hover disabled:opacity-60 sm:w-auto"
          >
            {pending ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Submitting Manuscript…</span>
              </>
            ) : (
              <>
                <span>Submit Manuscript</span>
                <svg className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            Large manuscript files may take a moment to upload. Please do not close this window.
          </p>
        </div>
      </fieldset>
    </form>
  );
}

function Label({ htmlFor, required, children }: { htmlFor: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-bold text-foreground">
      {children} {required && <span className="text-danger">*</span>}
    </label>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-semibold text-danger">{message}</p>;
}

function Field({
  label, name, type = "text", required, hint, error, malayalam, className, placeholder,
}: {
  label: string; name: string; type?: string; required?: boolean;
  hint?: string; error?: string; malayalam?: boolean; className?: string; placeholder?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name} required={required}>{label}</Label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-black/15 bg-background/90 px-4 py-3 text-base font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground dark:border-white/15 dark:bg-surface-muted/80 ${malayalam ? "font-ml" : ""}`}
      />
      {hint && !error && <p className="mt-1.5 text-xs font-medium text-muted-foreground">{hint}</p>}
      <ErrorText message={error} />
    </div>
  );
}

