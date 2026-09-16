"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { GENRES, LANGUAGES } from "@/lib/submission-fields";
import { SmoothDropdown } from "@/components/dropdown";
import { PhoneInput } from "@/components/ui/phone-input";
import { PlaceSelect } from "@/components/ui/place-select";
import { Sparkles } from "lucide-react";

const ACCEPT = ".pdf,.doc,.docx,.odt";
const MAX_MB = 25;
const SYNOPSIS_MIN = 100;

type FieldErrors = Record<string, string>;

export interface SubmissionFormProps {
  initialAuthorName?: string;
  initialEmail?: string;
  initialPhone?: string;
  initialPlace?: string;
  isAuthorPortal?: boolean;
  onSuccessRedirect?: string;
}

const DUMMY_AUTHORS = [
  {
    name: "Prof. S. R. Varma",
    nameMl: "പ്രൊഫ. എസ്. ആർ. വർമ്മ",
    emailPrefix: "author.varma",
    phone: "9847123456",
    place: "Kozhikode",
  },
  {
    name: "Dr. K. S. Radhakrishnan",
    nameMl: "ഡോ. കെ. എസ്. രാധാകൃഷ്ണൻ",
    emailPrefix: "radhakrishnan.ks",
    phone: "9447101234",
    place: "Thrissur",
  },
  {
    name: "Arundhathi Menon",
    nameMl: "അരുന്ധതി മേനോൻ",
    emailPrefix: "arundhathi.menon",
    phone: "9744234567",
    place: "Ernakulam",
  },
  {
    name: "Madhavan Nambiar",
    nameMl: "മാധവൻ നമ്പ്യാർ",
    emailPrefix: "madhavan.nambiar",
    phone: "9495345678",
    place: "Kannur",
  },
  {
    name: "Dr. Fathima Beevi",
    nameMl: "ഡോ. ഫാത്തിമ ബീവി",
    emailPrefix: "fathima.beevi",
    phone: "9895456789",
    place: "Malappuram",
  },
  {
    name: "Geevarghese Kurien",
    nameMl: "ഗീവർഗീസ് കുര്യൻ",
    emailPrefix: "geevarghese.kurien",
    phone: "9446567890",
    place: "Kottayam",
  },
  {
    name: "Balamani Amma K.",
    nameMl: "ബാലാമണി അമ്മ കെ.",
    emailPrefix: "balamani.amma",
    phone: "9633678901",
    place: "Palakkad",
  },
  {
    name: "Anand Neelakantan",
    nameMl: "ആനന്ദ് നീലകണ്ഠൻ",
    emailPrefix: "anand.neelakantan",
    phone: "9447789012",
    place: "Thiruvananthapuram",
  },
  {
    name: "Jayachandran Nair",
    nameMl: "ജയചന്ദ്രൻ നായർ",
    emailPrefix: "jayachandran.nair",
    phone: "9846890123",
    place: "Kollam",
  },
  {
    name: "Devika P. Pillai",
    nameMl: "ദേവിക പി. പിള്ള",
    emailPrefix: "devika.pillai",
    phone: "9745901234",
    place: "Alappuzha",
  },
  {
    name: "Sudheesh Kumar",
    nameMl: "സുധീഷ് കുമാർ",
    emailPrefix: "sudheesh.kumar",
    phone: "9847112233",
    place: "Wayanad",
  },
  {
    name: "Parvathy S. Warrier",
    nameMl: "പാർവതി എസ്. വാര്യർ",
    emailPrefix: "parvathy.warrier",
    phone: "9447334455",
    place: "Kasargod",
  },
];

const DUMMY_MANUSCRIPTS = [
  {
    title: "Kadalinte Nizhalukal",
    titleMl: "കടലിന്റെ നിഴലുകൾ",
    genre: "novel",
    language: "Malayalam",
    synopsis: "A comprehensive family saga based along the North Malabar coastline spanning the late 20th century. Follows the lives of three seafaring generations navigating coastal trade, changing maritime economies, and personal sacrifice across 320 structured pages.",
  },
  {
    title: "Puzhayude Ormakal",
    titleMl: "പുഴയുടെ ഓർമ്മകൾ",
    genre: "novel",
    language: "Malayalam",
    synopsis: "Set along the banks of the Bharathapuzha, this poignant narrative captures the gradual erosion of traditional agrarian life in central Kerala, intertwining local folklore, monsoon memories, and the dreams of a migrating generation.",
  },
  {
    title: "Nizhalukalude Sangeetham",
    titleMl: "നിഴലുകളുടെ സംഗീതം",
    genre: "poetry",
    language: "Malayalam",
    synopsis: "A lyrical anthology of fifty-four reflective poems exploring urban isolation, philosophical musings on time, transient relationships, and ecological grief in modern Kerala, composed in contemporary free-verse rhythms.",
  },
  {
    title: "Malayala Sahithya Charithram",
    titleMl: "മലയാള സാഹിത്യ ചരിത്രം",
    genre: "academic",
    language: "Malayalam",
    synopsis: "An in-depth critical inquiry tracing the historical evolution of modern Malayalam prose and linguistic syntax from early 19th-century missionary print culture through post-independence literary modernism.",
  },
  {
    title: "Kanavu Kanda Theeram",
    titleMl: "കനവു കണ്ട തീരം",
    genre: "short_stories",
    language: "Malayalam",
    synopsis: "A collection of twelve gripping short stories depicting ordinary working-class protagonists across suburban towns, exploring themes of familial bonds, unexpected moral dilemmas, and the quiet dignity of resilience.",
  },
  {
    title: "Himalayan Yathrakal",
    titleMl: "ഹിമാലയൻ യാത്രകൾ",
    genre: "travelogue",
    language: "Malayalam",
    synopsis: "An evocative travelogue documenting solitary trekking expeditions across high-altitude Himalayan passes, Tibetan monasteries, and sacred mountain villages, illustrated with cultural reflections and local lore.",
  },
  {
    title: "Nalukettinte Niyogam",
    titleMl: "നാലുകെട്ടിന്റെ നിയോഗം",
    genre: "drama",
    language: "Malayalam",
    synopsis: "A three-act theatrical drama highlighting the internal conflicts, property disputes, and emotional dissolution within a crumbling feudal aristocratic household during the land reform period.",
  },
  {
    title: "Kuttippattukal",
    titleMl: "കുട്ടിപ്പാട്ടുകൾ",
    genre: "childrens",
    language: "Malayalam",
    synopsis: "An enchanting compendium of rhythmic rhymes, playful animal fables, and richly illustrated bedtime adventures designed to nurture curiosity, kindness, and linguistic imagination in young readers aged 5 to 10.",
  },
  {
    title: "Jeevithathinte Velicham",
    titleMl: "ജീവിതത്തിന്റെ വെളിച്ചം",
    genre: "biography",
    language: "Malayalam",
    synopsis: "An inspiring biographical tribute recounting the pioneering struggles and selfless socio-educational reforms spearheaded by a legendary grassroots social reformer across rural Travancore.",
  },
  {
    title: "Athmavinte Mozhikal",
    titleMl: "ആത്മാവിന്റെ മൊഴികൾ",
    genre: "essays",
    language: "Malayalam",
    synopsis: "A thought-provoking collection of philosophical and literary essays contemplating classical aesthetics, cultural identity in the globalized era, and the transformative power of the written word.",
  },
  {
    title: "Nilavinte Niram",
    titleMl: "നിലാവിന്റെ നിറം",
    genre: "novel",
    language: "Malayalam",
    synopsis: "A psychological mystery centered on an ancestral manor in the high ranges of Idukki, unravelling decades-old secrets through letters, diary fragments, and local tea-estate folklore across 280 riveting pages.",
  },
  {
    title: "Vazhiye Pokunnavar",
    titleMl: "വഴിയെ പോകുന്നവർ",
    genre: "short_stories",
    language: "Malayalam",
    synopsis: "Nine contemporary tales capturing fleeting encounters at railway stations, tea shops, and bus stops across small-town Kerala, exploring human vulnerability, humor, and empathy.",
  },
];

export default function SubmissionForm({
  initialAuthorName = "",
  initialEmail = "",
  initialPhone = "",
  initialPlace = "",
  isAuthorPortal = false,
  onSuccessRedirect,
}: SubmissionFormProps = {}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const authorIndexRef = useRef(0);
  const manuscriptIndexRef = useRef(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [synopsis, setSynopsis] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("Malayalam");
  const [currentStep, setCurrentStep] = useState<1 | 2>(isAuthorPortal ? 2 : 1);
  const [authorNameVal, setAuthorNameVal] = useState(initialAuthorName);
  const [emailVal, setEmailVal] = useState(initialEmail);
  const [fileName, setFileName] = useState<string | null>(null);
  const [coverFileName, setCoverFileName] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [submittedData, setSubmittedData] = useState<{
    refNo: string;
    title?: string;
  } | null>(null);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setCoverFileName(null);
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
        setCoverPreviewUrl(null);
      }
      return;
    }
    setCoverFileName(file.name);
    if (file.type.startsWith("image/")) {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(URL.createObjectURL(file));
    } else {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }
  }

  function handleRemoveCover() {
    setCoverFileName(null);
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  }

  function handleMalayalamKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
    }
  }

  function handleMalayalamInput(e: React.FormEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const filtered = input.value.replace(/[a-zA-Z]/g, "");
    if (filtered !== input.value) {
      input.value = filtered;
    }
  }

  function handleFillDummyStep1() {
    const authorIndex = authorIndexRef.current % DUMMY_AUTHORS.length;
    authorIndexRef.current += 1;
    const author = DUMMY_AUTHORS[authorIndex];
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    
    setAuthorNameVal(author.name);
    setEmailVal(`${author.emailPrefix}.${randomSuffix}@kairalibooks.org`);
    
    if (formRef.current) {
      const mlInput = formRef.current.querySelector('input[name="author_name_ml"]') as HTMLInputElement;
      if (mlInput) mlInput.value = author.nameMl;
      const phoneInput = formRef.current.querySelector('input[name="phone"]') as HTMLInputElement;
      if (phoneInput) {
        phoneInput.value = author.phone;
        phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const placeInput = formRef.current.querySelector('input[name="place"]') as HTMLInputElement;
      if (placeInput) {
        placeInput.value = author.place;
        placeInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  function handleFillDummyStep2() {
    const manuscriptIndex = manuscriptIndexRef.current % DUMMY_MANUSCRIPTS.length;
    manuscriptIndexRef.current += 1;
    const item = DUMMY_MANUSCRIPTS[manuscriptIndex];
    const randomId = Math.floor(100 + Math.random() * 900);

    if (formRef.current) {
      const titleInput = formRef.current.querySelector('input[name="title"]') as HTMLInputElement;
      if (titleInput) titleInput.value = item.title;
      const titleMlInput = formRef.current.querySelector('input[name="title_ml"]') as HTMLInputElement;
      if (titleMlInput) titleMlInput.value = item.titleMl;
      
      setSelectedGenre(item.genre);
      setSelectedLanguage(item.language);
      
      const fileInput = formRef.current.querySelector('input[name="manuscript"]') as HTMLInputElement;
      if (fileInput) {
        const sanitizedName = item.title.replace(/[^a-zA-Z0-9]/g, "_");
        const dummyFile = new File(
          [`Kairali Books - Demo manuscript content for review and testing.\nTitle: ${item.title}\nGenre: ${item.genre}\nReference: DEMO-${randomId}`],
          `${sanitizedName}_Manuscript.pdf`,
          { type: "application/pdf" }
        );
        try {
          const dt = new DataTransfer();
          dt.items.add(dummyFile);
          fileInput.files = dt.files;
          setFileName(dummyFile.name);
        } catch {
          setFileName(`${sanitizedName}_Manuscript.pdf`);
        }
      }
    }
    setSynopsis(item.synopsis);
  }

  function resetForm() {
    setSubmittedData(null);
    setCurrentStep(isAuthorPortal ? 2 : 1);
    setSynopsis("");
    setSelectedGenre("");
    setSelectedLanguage("Malayalam");
    setFileName(null);
    setCoverFileName(null);
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
    setErrors({});
    setFormError(null);
    if (formRef.current) {
      formRef.current.reset();
    }
  }

  function handleNextStep() {
    const stepErrors: FieldErrors = {};
    if (!authorNameVal.trim()) {
      stepErrors.author_name = "Please enter the author's full name.";
    }
    if (!emailVal.trim()) {
      stepErrors.email = "Please enter a valid email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal.trim())) {
      stepErrors.email = "Please enter a valid email address (e.g. author@example.com).";
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setFormError("Please complete the required author details to continue.");
      return;
    }

    setErrors({});
    setFormError(null);
    setCurrentStep(2);
    window.scrollTo({ top: 120, behavior: "smooth" });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const bookTitle = (formData.get("title") as string) || "";
    if (isAuthorPortal) {
      formData.set("author_name", initialAuthorName || "Author");
      formData.set("email", initialEmail);
      if (initialPhone) formData.set("phone", initialPhone);
      if (initialPlace) formData.set("place", initialPlace);
    }
    const authorName = (formData.get("author_name") as string) || authorNameVal || initialAuthorName;
    const authorEmail = (formData.get("email") as string) || emailVal || initialEmail;

    try {
      const res = await fetch("/api/public/submissions", {
        method: "POST",
        body: formData,
      });
      const body = await res.json();

      if (!res.ok || !body.ok) {
        if (Array.isArray(body?.issues)) {
          const next: FieldErrors = {};
          let hasStep1Issue = false;
          for (const issue of body.issues) {
            next[issue.path] = issue.message;
            if (["author_name", "email", "phone", "place"].includes(issue.path)) {
              hasStep1Issue = true;
            }
          }
          setErrors(next);
          setFormError("Please correct the highlighted fields.");
          if (hasStep1Issue && !isAuthorPortal) {
            setCurrentStep(1);
          }
          const first = document.getElementById(body.issues[0]?.path);
          first?.scrollIntoView({ behavior: "smooth", block: "center" });
          (first as HTMLElement | null)?.focus?.();
        } else {
          setFormError(body?.error ?? "We could not accept the submission. Please try again.");
        }
        setPending(false);
        return;
      }

      if (isAuthorPortal) {
        setSubmittedData({
          refNo: body.data.refNo,
          title: bookTitle,
        });
        setPending(false);
        return;
      }

      if (onSuccessRedirect) {
        router.push(`${onSuccessRedirect}?submitted=${encodeURIComponent(body.data.refNo)}`);
        return;
      }

      const params = new URLSearchParams({
        ref: body.data.refNo,
        weeks: String(body.data.responseWeeks),
        name: authorName,
        email: authorEmail,
      });
      router.push(`/publish/submitted?${params}`);
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  if (submittedData) {
    return (
      <div className="rounded-[28px] border border-black/10 bg-surface p-8 shadow-sm backdrop-blur-xl dark:border-white/10 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-success/15 text-success mb-5">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Manuscript Received
        </span>

        <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl  ">
          Manuscript Submitted Successfully!
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {submittedData.title ? `"${submittedData.title}" has` : "Your manuscript has"} been received and queued for editorial evaluation.
        </p>

        {/* Reference Details Box */}
        <div className="mt-6 mx-auto max-w-md rounded-2xl border border-black/8 bg-black/[0.02] p-5 text-left dark:border-white/10 dark:bg-white/[0.02] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Tracking Reference:</span>
            <span className="font-mono font-bold text-foreground text-sm">{submittedData.refNo}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Status:</span>
            <span className="inline-flex items-center gap-1 font-bold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Pending Editorial Review
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-muted-foreground font-medium">Estimated Review Time:</span>
            <span className="font-semibold text-foreground">~3 – 4 weeks</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <Link
            href="/author"
            className="apple-button w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#7e2562] px-6 py-3 text-xs font-extrabold text-white shadow-plum-sm hover:bg-[#681b50] transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Go to Author Dashboard</span>
          </Link>

          <button
            type="button"
            onClick={resetForm}
            className="apple-button w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-black/15 bg-surface px-5 py-3 text-xs font-bold text-foreground shadow-xs hover:bg-black/5 dark:border-white/15 dark:bg-surface-muted/60 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Write &amp; Submit New One</span>
          </button>
        </div>
      </div>
    );
  }

  const synopsisShort = synopsis.trim().length > 0 && synopsis.trim().length < SYNOPSIS_MIN;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Step Header: Single Step Author Chip for Portal vs 2-Step Stepper for Guests */}
      {isAuthorPortal ? (
        <div className="rounded-2xl border border-[#7e2562]/20 bg-[#faedf5]/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#7e2562] text-white flex items-center justify-center font-bold text-base shadow-plum-xs">
              {(initialAuthorName || "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Author: <strong className="text-[#7e2562]">{initialAuthorName}</strong>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">{initialEmail}</p>
            </div>
          </div>
        
        </div>
      ) : (
        <div className="rounded-3xl border border-[#7e2562]/15 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-3 text-left group cursor-pointer transition-all"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold transition-all ${
                  currentStep === 1
                    ? "bg-[#7e2562] text-white shadow-plum-sm ring-4 ring-[#7e2562]/15"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {currentStep > 1 ? "✓" : "1"}
              </span>
              <div>
                <p className={`text-xs font-bold ${currentStep === 1 ? "text-[#7e2562]" : "text-foreground"}`}>
                  Step 1: Author Details
                </p>
                <p className="text-[11px] text-muted-foreground hidden sm:block">Identity &amp; contact info</p>
              </div>
            </button>

            <div
              className={`flex-1 h-0.5 mx-4 sm:mx-6 rounded-full transition-all ${
                currentStep === 2 ? "bg-[#7e2562]" : "bg-[#7e2562]/15"
              }`}
            />

            <button
              type="button"
              onClick={() => {
                if (authorNameVal.trim() && emailVal.trim()) {
                  setCurrentStep(2);
                }
              }}
              className={`flex items-center gap-3 text-left transition-all ${
                authorNameVal.trim() && emailVal.trim() ? "cursor-pointer group" : "cursor-default opacity-70"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold transition-all ${
                  currentStep === 2
                    ? "bg-[#7e2562] text-white shadow-plum-sm ring-4 ring-[#7e2562]/15"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                2
              </span>
              <div>
                <p className={`text-xs font-bold ${currentStep === 2 ? "text-[#7e2562]" : "text-muted-foreground"}`}>
                  Step 2: Manuscript &amp; Upload
                </p>
                <p className="text-[11px] text-muted-foreground hidden sm:block">Category, synopsis &amp; draft</p>
              </div>
            </button>
          </div>
        </div>
      )}

      <fieldset disabled={pending} className="space-y-6">
        {formError && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 animate-in fade-in">
            {formError}
          </div>
        )}

        {/* Hidden inputs for Author Portal */}
        {isAuthorPortal && (
          <>
            <input type="hidden" name="author_name" value={initialAuthorName || "Author"} />
            <input type="hidden" name="email" value={initialEmail} />
            {initialPhone && <input type="hidden" name="phone" value={initialPhone} />}
            {initialPlace && <input type="hidden" name="place" value={initialPlace} />}
          </>
        )}

        {/* STEP 1: Author Information (Only for guests) */}
        {!isAuthorPortal && (
          <section
            className={`rounded-3xl border border-[#7e2562]/15 bg-white p-6 shadow-plum-sm sm:p-8 transition-all ${
              currentStep === 1 ? "block animate-in fade-in" : "hidden"
            }`}
          >
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#7e2562]/10">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7e2562] text-sm font-extrabold text-white shadow-plum-sm">
                  1
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Author Information</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">How our editorial committee can correspond directly with you</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFillDummyStep1}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#7e2562] bg-[#faedf5] hover:bg-[#f3dcee] border border-[#7e2562]/20 rounded-sm shadow-2xs transition-all cursor-pointer"
                title="Populate test author data for staging"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#7e2562]" />
                <span>Fill Dummy Data</span>
              </button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="author_name" required>Author Full Name</Label>
                <input
                  id="author_name"
                  name="author_name"
                  type="text"
                  required
                  value={authorNameVal}
                  onChange={(e) => setAuthorNameVal(e.target.value)}
                  placeholder="e.g. M. T. Vasudevan Nair"
                  className="w-full rounded-xl border border-[#7e2562]/20 bg-white px-4 py-3 text-base font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
                />
                <ErrorText message={errors.author_name} />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="author_name_ml">Author Name in Malayalam (Optional)</Label>
                <input
                  id="author_name_ml"
                  name="author_name_ml"
                  type="text"
                  onKeyDown={handleMalayalamKeyDown}
                  onInput={handleMalayalamInput}
                  placeholder="e.g. എം. ടി. വാസുദേവൻ നായർ"
                  className="font-ml w-full rounded-xl border border-[#7e2562]/20 bg-white px-4 py-3 text-base font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
                />
                <p className="mt-1 text-xs text-muted-foreground/80">മലയാളം അക്ഷരങ്ങൾ മാത്രം നൽകുക (English letters disabled)</p>
              </div>

              <div>
                <Label htmlFor="email" required>Email Address</Label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={emailVal}
                  onChange={(e) => setEmailVal(e.target.value)}
                  placeholder="author@example.com"
                  className="w-full rounded-xl border border-[#7e2562]/20 bg-white px-4 py-3 text-base font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
                />
                <p className="mt-1.5 text-xs font-medium text-muted-foreground">We dispatch formal confirmation &amp; review notes here</p>
                <ErrorText message={errors.email} />
              </div>

              <div className="sm:col-span-1">
                <PhoneInput
                  id="phone"
                  name="phone"
                  label="Phone / WhatsApp Number"
                  defaultValue={initialPhone}
                  error={errors.phone}
                  hint="For editorial correspondence & WhatsApp updates"
                  isWhatsApp={true}
                />
              </div>
              <div className="sm:col-span-1">
                <PlaceSelect
                  id="place"
                  name="place"
                  defaultValue={initialPlace}
                  error={errors.place}
                  hint="Select your town / district for editorial records"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end border-t border-[#7e2562]/10 pt-6">
              <button
                type="button"
                onClick={handleNextStep}
                className="apple-button inline-flex items-center gap-2 rounded-2xl bg-[#7e2562] px-7 py-3.5 text-sm font-bold text-white shadow-plum-md hover:bg-[#681b50] hover:shadow-plum-lg active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Continue to Manuscript Details</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: Manuscript Details & Upload */}
        <section
          className={`rounded-3xl border border-[#7e2562]/15 bg-white p-6 shadow-plum-sm sm:p-8 transition-all ${
            isAuthorPortal || currentStep === 2 ? "block animate-in fade-in" : "hidden"
          }`}
        >
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#7e2562]/10">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7e2562] text-sm font-extrabold text-white shadow-plum-sm">
                2
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Manuscript Details</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Category, synopsis, and document upload</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFillDummyStep2}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#7e2562] bg-[#faedf5] hover:bg-[#f3dcee] border border-[#7e2562]/20 rounded-sm shadow-2xs transition-all cursor-pointer"
              title="Populate test manuscript details for staging"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#7e2562]" />
              <span>Fill Dummy Data</span>
            </button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Book Title" name="title" required error={errors.title} className="sm:col-span-2" placeholder="Title of your book" />

            <div className="sm:col-span-2">
              <Label htmlFor="title_ml">Book Title in Malayalam (Optional)</Label>
              <input
                id="title_ml"
                name="title_ml"
                type="text"
                onKeyDown={handleMalayalamKeyDown}
                onInput={handleMalayalamInput}
                placeholder="പുസ്തകത്തിന്റെ പേര്"
                className="font-ml w-full rounded-xl border border-[#7e2562]/20 bg-white px-4 py-3 text-base font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
              />
              <p className="mt-1 text-xs text-muted-foreground/80">മലയാളം അക്ഷരങ്ങൾ മാത്രം നൽകുക (English letters disabled)</p>
            </div>

            <div>
              <Label htmlFor="genre" required>Genre / Category</Label>
              <SmoothDropdown
                id="genre"
                name="genre"
                size="lg"
                value={selectedGenre}
                onChange={(val) => {
                  setSelectedGenre(val);
                  if (errors.genre) setErrors((prev) => ({ ...prev, genre: "" }));
                }}
                placeholder="Choose a category…"
                options={GENRES.map((g) => ({
                  value: g.value,
                  label: g.en,
                  description: g.ml,
                }))}
              />
              <ErrorText message={errors.genre} />
            </div>

            <div>
              <Label htmlFor="language">Language</Label>
              <SmoothDropdown
                id="language"
                name="language"
                size="lg"
                value={selectedLanguage}
                onChange={(val) => {
                  setSelectedLanguage(val);
                  if (errors.language) setErrors((prev) => ({ ...prev, language: "" }));
                }}
                options={LANGUAGES.map((l) => ({
                  value: l.value,
                  label: l.en,
                  description: l.ml,
                }))}
              />
              <ErrorText message={errors.language} />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="synopsis" required>Literary Synopsis</Label>
              <textarea
                id="synopsis"
                name="synopsis"
                rows={6}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="What is the work about? Who is the target readership? Outline major plot points, central arguments, characters, and any previous publications or awards."
                className="w-full rounded-2xl border border-[#7e2562]/20 bg-white p-4 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15"
              />
              <div className="mt-2 flex justify-between text-xs">
                <ErrorText
                  message={errors.synopsis ?? (synopsisShort ? `${SYNOPSIS_MIN - synopsis.trim().length} more characters needed` : undefined)}
                />
                <span className={`numeric font-bold ${synopsisShort ? "text-amber-600" : "text-[#7e2562]"}`}>
                  {synopsis.trim().length} / {SYNOPSIS_MIN} min characters
                </span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="manuscript" required>Manuscript Document File</Label>
              <div className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#7e2562]/25 bg-[#faf6f9]/60 p-7 transition-all hover:border-[#7e2562]/60 hover:bg-[#faf6f9] cursor-pointer">
                <input
                  id="manuscript"
                  name="manuscript"
                  type="file"
                  accept={ACCEPT}
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10"
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7e2562]/10 text-[#7e2562] mb-3 transition-transform duration-200 group-hover:scale-110 pointer-events-none">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 text-center pointer-events-none">
                  <span className="rounded-xl bg-[#7e2562] px-4 py-2 text-xs font-bold text-white shadow-plum-sm group-hover:bg-[#681b50] transition-colors">
                    {fileName ? "Change File" : "Choose File"}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {fileName ? fileName : "or click / drag and drop here"}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-[#7e2562] pointer-events-none text-center">
                  {fileName ? `✓ Selected: ${fileName}` : `Supported: PDF, DOC, DOCX or ODT · Max ${MAX_MB} MB`}
                </p>
              </div>
              <ErrorText message={errors.manuscript} />
            </div>

            {/* Optional Cover Design Section */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="cover">
                  Book Cover Design <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
                </Label>
                {coverFileName && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Remove Cover
                  </button>
                )}
              </div>
              <div className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#7e2562]/20 bg-[#faedf5]/30 p-6 transition-all hover:border-[#7e2562]/50 hover:bg-[#faedf5]/60 cursor-pointer">
                <input
                  ref={coverInputRef}
                  id="cover"
                  name="cover"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleCoverChange}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10"
                />
                
                {coverPreviewUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 pointer-events-none w-full max-w-md bg-white p-3 rounded-xl border border-[#7e2562]/20 shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPreviewUrl}
                      alt="Cover Preview"
                      className="h-20 w-16 object-cover rounded-lg shadow-xs border border-gray-200"
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 mb-1">
                        ✓ Cover Image Selected
                      </span>
                      <p className="text-xs font-bold text-foreground truncate">{coverFileName}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Click or drop to replace</p>
                    </div>
                  </div>
                ) : coverFileName ? (
                  <div className="flex items-center gap-3 pointer-events-none bg-white px-4 py-2.5 rounded-xl border border-[#7e2562]/20 shadow-2xs">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7e2562]/10 text-[#7e2562]">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-foreground truncate">{coverFileName}</p>
                      <span className="text-[10px] text-emerald-700 font-semibold">✓ Document / PDF Attached</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7e2562]/10 text-[#7e2562] mb-2 transition-transform duration-200 group-hover:scale-110 pointer-events-none">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 text-center pointer-events-none">
                      <span className="rounded-xl border border-[#7e2562]/30 bg-white px-3.5 py-1.5 text-xs font-bold text-[#7e2562] shadow-2xs group-hover:bg-[#faedf5] transition-colors">
                        Choose Cover File
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        or click / drag and drop here
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground pointer-events-none text-center">
                      Attach artwork concept, illustration, or draft layout (PDF, PNG, JPG, or WEBP · Max 25 MB)
                    </p>
                  </>
                )}
              </div>
              <ErrorText message={errors.cover} />
            </div>
          </div>
        </section>

        {/* Honeypot */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {/* SUBMIT SECTION (Visible in Author Portal or Step 2) */}
        {(isAuthorPortal || currentStep === 2) && (
          <section className="rounded-3xl border border-[#7e2562]/20 bg-white p-6 sm:p-8 shadow-plum-sm text-center animate-in fade-in">
            <div className="mx-auto max-w-xl">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                {!isAuthorPortal && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="apple-button w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-black/15 bg-white px-5 py-4 text-xs font-bold text-foreground shadow-2xs hover:bg-black/5 transition-all cursor-pointer"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Back to Author Details</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="apple-button group flex-1 inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-[#7e2562] px-8 py-4 text-base font-bold text-white shadow-plum-md hover:bg-[#681b50] hover:shadow-plum-lg active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer"
                >
                  {pending ? (
                    <>
                      <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Uploading &amp; Submitting Manuscript…</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Manuscript for Review</span>
                      <svg className="h-5 w-5 opacity-90 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {/* Helper & Security Text Brought Down Below Button */}
              <div className="mt-4 space-y-2">
                <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span>Manuscripts are encrypted &amp; securely transferred to Kairali Books editorial repository.</span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[11px] font-medium text-muted-foreground/80">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    No Reading Fees
                  </span>
                  <span>•</span>
                  <span>Immediate Tracking ID</span>
                  <span>•</span>
                  <span>100% Author Copyright Retained</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </fieldset>
    </form>
  );
}

function Label({ htmlFor, required, children }: { htmlFor: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-bold text-foreground">
      {children} {required && <span className="text-rose-600 font-bold">*</span>}
    </label>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-semibold text-rose-600">{message}</p>;
}

function Field({
  label, name, type = "text", required, hint, error, malayalam, className, placeholder, defaultValue,
}: {
  label: string; name: string; type?: string; required?: boolean;
  hint?: string; error?: string; malayalam?: boolean; className?: string; placeholder?: string; defaultValue?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name} required={required}>{label}</Label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onKeyDown={malayalam ? (e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
            e.preventDefault();
          }
        } : undefined}
        onInput={malayalam ? (e) => {
          const input = e.currentTarget;
          const filtered = input.value.replace(/[a-zA-Z]/g, "");
          if (filtered !== input.value) input.value = filtered;
        } : undefined}
        className={`w-full rounded-xl border border-[#7e2562]/20 bg-white px-4 py-3 text-base font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[#7e2562] focus:ring-3 focus:ring-[#7e2562]/15 ${malayalam ? "font-ml" : ""}`}
      />
      {hint && !error && <p className="mt-1.5 text-xs font-medium text-muted-foreground">{hint}</p>}
      <ErrorText message={error} />
    </div>
  );
}

