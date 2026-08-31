import type { Capability, Role } from "@/lib/roles";
import { can } from "@/lib/roles";

export type NavItem = {
  label: string;
  href: string;
  capability: Capability | null;
  /** Sections light up as each user flow is built. */
  ready: boolean;
};

export const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", capability: null, ready: true },
  { label: "Submissions", href: "/submissions", capability: "submissions.read", ready: true },
  { label: "Production", href: "/production", capability: "production_pipeline.read", ready: true },
  { label: "Titles", href: "/titles", capability: "titles.read", ready: false },
  { label: "Authors", href: "/authors", capability: "authors.read", ready: false },
  { label: "Contracts", href: "/contracts", capability: "contracts.read", ready: true },
  { label: "Sales", href: "/sales", capability: "sales.read", ready: false },
  { label: "Dealers", href: "/dealers", capability: "dealers.read", ready: false },
  { label: "Stock", href: "/stock", capability: "stock.read", ready: false },
  { label: "Print Jobs", href: "/print-jobs", capability: "print.read", ready: false },
  { label: "Royalty Payouts", href: "/payouts", capability: "payouts.read", ready: false },
  { label: "Reports", href: "/reports", capability: "reports.read", ready: false },
  { label: "Team", href: "/team", capability: "users.manage", ready: true },
  { label: "User Guide", href: "/guide", capability: null, ready: true },
  { label: "Settings", href: "/settings", capability: "settings.manage", ready: false },
];

export function navFor(role: Role): NavItem[] {
  return NAV.filter(
    (item) => item.ready && (item.capability === null || can(role, item.capability))
  );
}
