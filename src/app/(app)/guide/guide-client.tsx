"use client";

import { useState } from "react";
import Link from "next/link";

type SectionKey =
  | "overview"
  | "submissions"
  | "contracts"
  | "signing"
  | "production"
  | "team"
  | "accounts";

export default function GuideClient({ currentUserRole }: { currentUserRole: string }) {
  const [activeTab, setActiveTab] = useState<SectionKey>("overview");
  const [search, setSearch] = useState("");

  const sections: { id: SectionKey; title: string; badge: string }[] = [
    { id: "overview", title: "1. System Overview & Roles", badge: "Core" },
    { id: "submissions", title: "2. Submissions & Editorial Review", badge: "Editorial" },
    { id: "contracts", title: "3. Commercial Terms & Contracts", badge: "Legal" },
    { id: "signing", title: "4. Digital Dual-Signing Workflow", badge: "Security" },
    { id: "production", title: "5. DTP & Production Pipeline", badge: "Press" },
    { id: "team", title: "6. Team & Staff Management", badge: "Admin" },
    { id: "accounts", title: "7. Test Accounts & Quick Links", badge: "Reference" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 font-sans">
      {/* Header Banner */}
      <div className="rounded-3xl border border-black/10 bg-surface p-8 shadow-xs dark:border-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Documentation & Manual
            </span>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground">
              Kairali PMS User Guide
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Operational workflows, role guidelines, and digital publishing procedures.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="apple-button rounded-xl border border-black/10 bg-surface px-4 py-2.5 text-xs font-bold text-foreground shadow-xs hover:bg-black/5 dark:border-white/15"
            >
              Print / Save PDF Guide
            </button>
            <Link
              href="/dashboard"
              className="apple-button rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background shadow-xs hover:opacity-90"
            >
              Back to Dashboard →
            </Link>
          </div>
        </div>

        {/* Quick Search */}
        <div className="mt-6">
          <input
            type="text"
            placeholder="Search topics (e.g. GST, Royalty, Digital Signing, Typesetting, Roles)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-black/12 bg-black/[0.02] px-4 py-3 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-foreground focus:bg-surface dark:border-white/15 dark:bg-white/[0.02]"
          />
        </div>
      </div>

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
            <h2 className="text-xl font-black text-foreground">1. System Roles & Capabilities</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Kairali PMS is streamlined around three active publishing roles to ensure smooth operational handoffs:
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-foreground">Owner</span>
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold text-foreground dark:bg-white/15">Full Access</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  Overall publishing operations, commercial contract sealing, final price lock, team member management, and financial payouts.
                </p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-foreground">Editor</span>
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold text-foreground dark:bg-white/15">Editorial</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  Manuscript review, author correspondence, submission decisions (Accept/Revise/Reject), and commercial terms configuration.
                </p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-foreground">Production</span>
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold text-foreground dark:bg-white/15">Press & DTP</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  DTP layout, cover design, galley proof approvals, printer coordination, and warehouse print receipt recording.
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
              <h2 className="text-xl font-black text-foreground">2. Submissions & Editorial Review</h2>
              <Link
                href="/submissions"
                className="text-xs font-bold text-foreground underline hover:opacity-80"
              >
                Go to Submissions →
              </Link>
            </div>

            <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
                <h3 className="text-sm font-extrabold text-foreground">Author Manuscript Portal (`/publish`)</h3>
                <p className="text-xs text-muted-foreground">
                  Prospective authors visit <strong>/publish</strong> to read submission guidelines and submit manuscripts online. Upon submission, they receive a tracking number (e.g. <code>KB-SUB-2026-0001</code>) and tracking link.
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
                      <li><strong>Request Revision</strong>: Notifies author to update the manuscript.</li>
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
              <h2 className="text-xl font-black text-foreground">3. Commercial Terms & Legal Structure</h2>
              <Link
                href="/contracts"
                className="text-xs font-bold text-foreground underline hover:opacity-80"
              >
                Go to Contracts →
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
                <span className="font-extrabold text-foreground text-sm block">Traditional Track (Kairali-Funded)</span>
                <p className="text-muted-foreground leading-relaxed">
                  The publisher finances 100% of editing, typesetting, and printing.
                </p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li><strong>Royalty %</strong>: Typically 10% to 15% on MRP.</li>
                  <li><strong>Advance (₹)</strong>: Non-refundable advance against royalties.</li>
                  <li><strong>Free Copies</strong>: 10 complimentary author copies.</li>
                  <li><strong>Author Discount</strong>: 40% discount on extra copies.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
                <span className="font-extrabold text-foreground text-sm block">Self-Publishing Track (Author-Funded)</span>
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
            <h2 className="text-xl font-black text-foreground">4. Digital Dual-Signing Workflow</h2>
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

      {/* SECTION 5: Production Pipeline */}
      {activeTab === "production" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-black/10 bg-surface p-8 space-y-6 dark:border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-foreground">5. Production & DTP Pipeline</h2>
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
                <span className="font-bold text-foreground block">1. DTP & Typesetting</span>
                <span className="text-[11px] text-muted-foreground">Malayalam font formatting & page styling</span>
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
                <span className="font-bold text-foreground block">4. ISBN & Price Lock</span>
                <span className="text-[11px] text-muted-foreground">Raja Rammohun Roy ISBN allocation</span>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                <span className="font-bold text-foreground block">5. Press Batching</span>
                <span className="text-[11px] text-muted-foreground">Offset print run & binding order</span>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                <span className="font-bold text-foreground block">6. Stock Receipt</span>
                <span className="text-[11px] text-muted-foreground">Warehouse inventory increment & ledger audit</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: Team Management */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-black/10 bg-surface p-8 space-y-6 dark:border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-foreground">6. Team & Staff Management</h2>
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

      {/* SECTION 7: Test Accounts & Credentials */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-black/10 bg-surface p-8 space-y-6 dark:border-white/10">
            <h2 className="text-xl font-black text-foreground">7. Live Cloud Test Accounts</h2>
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
                    <td className="px-4 py-3 text-muted-foreground">Submissions & Contracts</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-foreground">Production</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">press@kairalibooks.in</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">kairali123</td>
                    <td className="px-4 py-3 text-muted-foreground">Production Pipeline & Press</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
