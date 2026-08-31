"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { formatPaise } from "@/lib/money";
import { parseContractNotes, PUBLISHER_DETAILS, type ContractMetadata } from "@/lib/contracts";

type ContractData = {
  id: string;
  title_id: string;
  author_id: string;
  royalty_pct: number;
  basis: string;
  advance_paise: number;
  signed_on: string | null;
  term_notes: string | null;
  created_at: string;
  authors: {
    id: string;
    name: string;
    name_ml: string | null;
    email: string | null;
    phone: string | null;
    pan: string | null;
    address: string | null;
  };
  titles: {
    id: string;
    name: string;
    name_ml: string | null;
    category: string | null;
    language: string | null;
    stock: number;
    status: string;
  };
};

export default function SigningClient({ contract }: { contract: ContractData }) {
  const meta: ContractMetadata = parseContractNotes(contract.term_notes);
  const alreadySigned = !!meta.author_signed_at;

  const [sigMode, setSigMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState(contract.authors.name || "");
  const [pan, setPan] = useState(meta.author_pan || contract.authors.pan || "");
  const [bankAccount, setBankAccount] = useState(meta.author_bank_account || "");
  const [ifsc, setIfsc] = useState(meta.author_ifsc || "");
  const [agreed, setAgreed] = useState(alreadySigned);

  const [isSignedSuccess, setIsSignedSuccess] = useState(alreadySigned);
  const [signedDate, setSignedDate] = useState(meta.author_signed_at || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [sigMode]);

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (alreadySigned || isSignedSuccess) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleSignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please confirm your agreement to all contract terms");
      return;
    }

    let finalSig = "";
    if (sigMode === "draw") {
      if (!hasDrawn) {
        setError("Please draw your signature on the pad above or switch to Type Signature");
        return;
      }
      finalSig = canvasRef.current ? canvasRef.current.toDataURL("image/png") : "Drawn Signature";
    } else {
      if (!typedName.trim()) {
        setError("Please enter your full legal name for the digital signature");
        return;
      }
      finalSig = `Digitally Signed by ${typedName.trim()} (Typed Authentication)`;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${contract.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party: "author",
          signerName: typedName.trim() || contract.authors.name,
          signature: finalSig,
          pan: pan.trim().toUpperCase() || undefined,
          bankAccount: bankAccount.trim() || undefined,
          ifsc: ifsc.trim().toUpperCase() || undefined,
          agreed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error ?? "Failed to register digital signature");
      } else {
        setIsSignedSuccess(true);
        setSignedDate(new Date().toISOString().slice(0, 19).replace("T", " "));
      }
    } catch {
      setError("Network error while submitting signature. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 font-sans">
      {/* Top Banner / Breadcrumb (Hidden on print) */}
      <div className="no-print mb-8 flex items-center justify-between">
        <Link
          href="/publish"
          className="text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to Kairali Publishing
        </Link>
        <span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs font-mono font-bold text-foreground dark:bg-white/[0.08]">
          {meta.contract_ref || "CON-2026-0001"}
        </span>
      </div>

      {/* Success Notification Banner if Signed (Hidden on print) */}
      {isSignedSuccess && (
        <div className="no-print mb-8 rounded-3xl border border-success/30 bg-success/10 p-6 text-foreground shadow-xs">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success text-white font-black text-lg">
              ✓
            </div>
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-success">
                Agreement Successfully Dual-Signed!
              </h3>
              <p className="mt-1 text-xs text-foreground/80 leading-relaxed">
                This publishing contract is legally sealed by both Kairali Books and {contract.authors.name}.
                Your manuscript has automatically moved to our <strong>Production & DTP Typesetting Pipeline</strong>.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="apple-button rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background shadow-xs hover:opacity-90"
                >
                  Print / Download Sealed Agreement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Contract Card */}
      <div className="printable-contract overflow-hidden rounded-3xl border border-black/10 bg-surface shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-white/10">
        {/* Document Header */}
        <div className="border-b border-black/[0.06] bg-black/[0.02] p-8 text-center dark:border-white/[0.08] dark:bg-white/[0.02]">
          <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-widest block mb-1">
            Contract Ref: {meta.contract_ref || "CON-2026-0001"}
          </span>
          <h2 className="text-xl font-bold uppercase tracking-wider font-sans text-foreground">
            Book Publishing & Royalty Agreement
          </h2>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {contract.titles.name}
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            By <strong>{contract.authors.name}</strong> · Published by <strong>Kairali Books</strong>
          </p>
          <p className="text-[11px] text-muted-foreground font-sans mt-0.5">
            Rajaji Road, Kozhikode, Kerala · GSTIN: {PUBLISHER_DETAILS.gstin}
          </p>
        </div>

        {/* Quick Terms Bento Bar */}
        <div className="grid grid-cols-2 border-b border-black/[0.06] bg-surface p-6 sm:grid-cols-4 dark:border-white/[0.08]">
          <div className="p-3 text-center sm:text-left">
            <span className="text-[11px] font-bold text-muted-foreground">Royalty Rate</span>
            <p className="mt-0.5 text-lg font-black text-foreground">{contract.royalty_pct}%</p>
            <span className="text-[10px] text-muted-foreground">on {contract.basis.toUpperCase()}</span>
          </div>
          <div className="p-3 text-center sm:text-left">
            <span className="text-[11px] font-bold text-muted-foreground">Advance on Signing</span>
            <p className="mt-0.5 text-lg font-black text-foreground">
              {contract.advance_paise > 0 ? formatPaise(contract.advance_paise) : "None"}
            </p>
            <span className="text-[10px] text-muted-foreground">Non-refundable</span>
          </div>
          <div className="p-3 text-center sm:text-left">
            <span className="text-[11px] font-bold text-muted-foreground">Author Free Copies</span>
            <p className="mt-0.5 text-lg font-black text-foreground">{meta.free_copies}</p>
            <span className="text-[10px] text-muted-foreground">Complimentary</span>
          </div>
          <div className="p-3 text-center sm:text-left">
            <span className="text-[11px] font-bold text-muted-foreground">Contract Term</span>
            <p className="mt-0.5 text-lg font-black text-foreground">{meta.term_years} Years</p>
            <span className="text-[10px] text-muted-foreground">Exclusive Print</span>
          </div>
        </div>

        {/* Legal Articles Text */}
        <div className="p-8 space-y-6 text-sm text-foreground/90 leading-relaxed font-serif">
          <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 text-xs font-sans space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
            <p>
              <strong>PARTIES:</strong> <strong>Kairali Books</strong>, {PUBLISHER_DETAILS.address} (GSTIN: {PUBLISHER_DETAILS.gstin}) ("Publisher"), and <strong>{contract.authors.name}</strong>, {contract.authors.address || "Kerala, India"} ("Author").
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold font-sans text-foreground text-base">1. Grant of Publishing Rights</h3>
            <p>
              The Author grants the Publisher the exclusive right to print, publish, market, and distribute the literary work titled <strong>"{contract.titles.name}"</strong> in Malayalam throughout the world for an initial term of {meta.term_years} years.
            </p>

            <h3 className="font-bold font-sans text-foreground text-base">2. Royalty & Accounting Statements</h3>
            <p>
              The Publisher shall pay the Author a royalty of <strong>{contract.royalty_pct}%</strong> on the {contract.basis === "mrp" ? "Maximum Retail Price (MRP)" : "Net Realized Receipts"} for all copies sold. Royalty statements and payouts shall be accounted semi-annually, with Income Tax TDS deducted under Section 194J as required by Indian law.
            </p>

            <h3 className="font-bold font-sans text-foreground text-base">3. Editorial, Layout & Proofreading</h3>
            <p>
              The Publisher shall handle DTP typesetting, page layout, and cover design. The Author shall be provided with final galley proofs and will have a 14-day review window to submit corrections prior to mass printing.
            </p>

            <h3 className="font-bold font-sans text-foreground text-base">4. Author Copies & Purchase Privilege</h3>
            <p>
              The Author receives <strong>{meta.free_copies} complimentary printed copies</strong> upon publication, and is entitled to purchase additional copies for personal use at a <strong>{meta.author_discount_pct}% discount</strong> off the printed MRP.
            </p>

            <h3 className="font-bold font-sans text-foreground text-base">5. Copyright & Rights Reversion</h3>
            <p>
              Copyright in the text and literary content remains with the Author © {new Date().getFullYear()} {contract.authors.name}. If the book goes out of print and the Publisher fails to reprint within 12 months of formal notice, all publishing rights automatically revert to the Author.
            </p>

            <h3 className="font-bold font-sans text-foreground text-base">6. Legal Jurisdiction</h3>
            <p>
              This Agreement shall be governed by the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the Courts in <strong>Kozhikode (Calicut), Kerala</strong>.
            </p>
          </div>

          {/* Publisher Digital Seal */}
          <div className="pt-6 border-t border-black/10 font-sans dark:border-white/10">
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Publisher Digital Seal & Authorization
                  </span>
                  <p className="mt-1 font-bold text-foreground">{meta.publisher_signatory || PUBLISHER_DETAILS.signatory}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Authorized by Publisher
                  </span>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {meta.publisher_signed_at?.slice(0, 16) || "Timestamp Verified"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Digital Signature Form for Author (Hidden on Print) */}
        {!isSignedSuccess ? (
          <form onSubmit={handleSignSubmit} className="no-print border-t border-black/[0.06] bg-black/[0.015] p-8 space-y-6 dark:border-white/[0.08] dark:bg-white/[0.015]">
            <div>
              <h3 className="text-base font-extrabold text-foreground">
                Author Digital Signature & Verification
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete your details and digitally sign to execute this agreement.
              </p>
            </div>

            {/* Tax & Bank Details */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  Author PAN Card <span className="text-muted-foreground font-normal">(for 194J TDS)</span>
                </label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-black/12 bg-surface px-3.5 py-2.5 text-sm font-semibold uppercase text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground dark:border-white/15"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  Bank Account No. <span className="text-muted-foreground font-normal">(for Royalties)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789012"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full rounded-xl border border-black/12 bg-surface px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground dark:border-white/15"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  Bank IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="SBIN0001234"
                  maxLength={11}
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-black/12 bg-surface px-3.5 py-2.5 text-sm font-semibold uppercase text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground dark:border-white/15"
                />
              </div>
            </div>

            {/* Signature Input Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Digital Signature</label>
                <div className="flex items-center gap-1 rounded-xl border border-black/10 bg-black/[0.04] p-0.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => setSigMode("draw")}
                    className={`apple-button rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                      sigMode === "draw"
                        ? "bg-surface text-foreground shadow-xs font-extrabold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Draw Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigMode("type")}
                    className={`apple-button rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                      sigMode === "type"
                        ? "bg-surface text-foreground shadow-xs font-extrabold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Type Signature
                  </button>
                </div>
              </div>

              {sigMode === "draw" ? (
                <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-black/20 bg-surface dark:border-white/20">
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-40 touch-none cursor-crosshair"
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="apple-button rounded-lg bg-black/5 px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:bg-black/10 dark:bg-white/10"
                    >
                      Clear
                    </button>
                  </div>
                  {!hasDrawn && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold text-muted-foreground/40">
                      Sign here with your mouse or finger
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Enter your full legal name..."
                    className="w-full rounded-xl border border-black/12 bg-surface px-4 py-3 text-lg font-serif italic text-foreground outline-none transition-all focus:border-foreground dark:border-white/15"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Typing your name acts as an electronic signature under the Indian Information Technology Act.
                  </p>
                </div>
              )}
            </div>

            {/* Legal Consent Checkbox */}
            <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-surface p-4 cursor-pointer dark:border-white/10">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-foreground focus:ring-foreground"
              />
              <span className="text-xs text-foreground/80 leading-relaxed font-medium">
                I, <strong>{contract.authors.name}</strong>, hereby declare that I am the sole author and copyright owner of "{contract.titles.name}". I have read, understood, and voluntarily accept all terms and conditions of this Publishing Agreement.
              </span>
            </label>

            {error && (
              <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-3.5 text-xs font-bold text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !agreed}
              className="apple-button flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-extrabold text-background shadow-xs hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Securing Digital Signature...</span>
                </>
              ) : (
                <span>Accept & Digitally Sign Agreement</span>
              )}
            </button>
          </form>
        ) : (
          /* Sealed Author Stamp */
          <div className="border-t border-black/[0.06] bg-black/[0.015] p-8 dark:border-white/[0.08] dark:bg-white/[0.015]">
            <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-success uppercase tracking-wider">
                    Author Digital Signature Verified
                  </span>
                  <p className="mt-1 text-base font-extrabold text-foreground">{contract.authors.name}</p>
                  <p className="text-xs text-muted-foreground">
                    PAN: {meta.author_pan || pan || "On File"} · IP: {meta.author_signer_ip || "Verified"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Legally Executed
                  </span>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {signedDate ? signedDate.slice(0, 16) : "Timestamp Certified"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
