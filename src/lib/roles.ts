export const ROLES = [
  "owner",
  "editor",
  "designer",
  "dtp",
  "proofreader",
  "isbn",
  "production",
  "accounts",
  "store",
  "author",
] as const;

export type Role = (typeof ROLES)[number];

export function isRole(v: string): v is Role {
  return (ROLES as readonly string[]).includes(v);
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  editor: "Editor",
  designer: "Cover Designer",
  dtp: "DTP / Typesetter",
  proofreader: "Proofreader",
  isbn: "ISBN Specialist",
  production: "Production Manager",
  accounts: "Accounts",
  store: "Store",
  author: "Author",
};

export type StaffRole = Exclude<Role, "author">;

export const STAFF_ROLE_DEFINITIONS: {
  val: StaffRole;
  label: string;
  desc: string;
  badgeClass: string;
  dotClass: string;
}[] = [
  {
    val: "owner",
    label: "Owner",
    desc: "Full administrative publisher access across all system modules.",
    badgeClass: "border-purple-500/25 bg-purple-500/10 text-purple-700 dark:border-purple-400/25 dark:bg-purple-500/20 dark:text-purple-300",
    dotClass: "bg-purple-500",
  },
  {
    val: "editor",
    label: "Editor",
    desc: "Reviews manuscripts, decides acceptance, and manages editorial revisions.",
    badgeClass: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/20 dark:text-blue-300",
    dotClass: "bg-blue-500",
  },
  {
    val: "designer",
    label: "Cover Designer",
    desc: "Designs front/back cover art, typography, spine, and promotional graphics.",
    badgeClass: "border-pink-500/25 bg-pink-500/10 text-pink-700 dark:border-pink-400/25 dark:bg-pink-500/20 dark:text-pink-300",
    dotClass: "bg-pink-500",
  },
  {
    val: "dtp",
    label: "DTP / Typesetter",
    desc: "Handles interior page layouts, Malayalam typography, and print-ready typesetting.",
    badgeClass: "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-500/20 dark:text-indigo-300",
    dotClass: "bg-indigo-500",
  },
  {
    val: "proofreader",
    label: "Proofreader",
    desc: "Conducts galley proof inspections, checks author corrections, and final QA.",
    badgeClass: "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:border-teal-400/25 dark:bg-teal-500/20 dark:text-teal-300",
    dotClass: "bg-teal-500",
  },
  {
    val: "isbn",
    label: "ISBN Specialist",
    desc: "Coordinates Raja Rammohun Roy ISBN/CIP applications and registrations.",
    badgeClass: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/20 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  {
    val: "production",
    label: "Production Manager",
    desc: "Oversees print shop jobs, paper specifications, and post-production quality.",
    badgeClass: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:border-orange-400/25 dark:bg-orange-500/20 dark:text-orange-300",
    dotClass: "bg-orange-500",
  },
  {
    val: "accounts",
    label: "Accounts",
    desc: "Manages financial ledgers, dealer transactions, and author royalty settlements.",
    badgeClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/20 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  {
    val: "store",
    label: "Store",
    desc: "Oversees warehouse stock movement, distribution, and inventory levels.",
    badgeClass: "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-500/20 dark:text-cyan-300",
    dotClass: "bg-cyan-500",
  },
];

/**
 * Splits a role string (e.g. "editor,designer,dtp") into individual roles.
 */
export function parseUserRoles(roleStr: string | null | undefined): Role[] {
  if (!roleStr) return [];
  return roleStr
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter((r): r is Role => (ROLES as readonly string[]).includes(r));
}

/**
 * Formats a comma-separated role string into human-friendly role labels.
 */
export function formatRoleLabel(roleStr: string | null | undefined): string {
  const roles = parseUserRoles(roleStr);
  if (roles.length === 0) return "User";
  return roles.map((r) => ROLE_LABEL[r] ?? r).join(", ");
}

/**
 * Checks if a user has a specific role (or is an owner, who has universal privileges).
 */
export function hasRole(userRoleStr: string | null | undefined, targetRole: Role): boolean {
  if (!userRoleStr) return false;
  const roles = parseUserRoles(userRoleStr);
  if (roles.includes("owner")) return true;
  return roles.includes(targetRole);
}

/**
 * Checks if a user has any of the listed roles (or is an owner).
 */
export function hasAnyRole(userRoleStr: string | null | undefined, targetRoles: Role[]): boolean {
  if (!userRoleStr) return false;
  const roles = parseUserRoles(userRoleStr);
  if (roles.includes("owner")) return true;
  return targetRoles.some((r) => roles.includes(r));
}

/**
 * Capability map. Keep permission checks pointed at capabilities, never at raw
 * role strings, so access can be retuned in one place as flows are added.
 */
export const CAPABILITIES = [
  "titles.read", "titles.write",
  "authors.read", "authors.write",
  "contracts.read", "contracts.write",
  "dealers.read", "dealers.write",
  "sales.read", "sales.write",
  "stock.read", "stock.write",
  "print.read", "print.write",
  "payouts.read", "payouts.write",
  "reports.read",
  "users.manage", "settings.manage",
  "submissions.read", "submissions.review", "submissions.manage",
  "production_pipeline.read", "production_pipeline.write", "production_pipeline.manage",
  "author_portal.access",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const ROLE_CAPS: Record<Role, readonly Capability[]> = {
  owner: CAPABILITIES,
  editor: [
    "titles.read",
    "submissions.read", "submissions.review",
    "production_pipeline.read", "production_pipeline.write", "production_pipeline.manage",
  ],
  designer: [
    "titles.read",
    "production_pipeline.read", "production_pipeline.write",
  ],
  dtp: [
    "titles.read",
    "production_pipeline.read", "production_pipeline.write",
  ],
  proofreader: [
    "titles.read",
    "production_pipeline.read", "production_pipeline.write",
  ],
  isbn: [
    "titles.read",
    "production_pipeline.read", "production_pipeline.write",
  ],
  production: [
    "titles.read",
    "stock.read", "stock.write",
    "print.read", "print.write",
    "reports.read",
    "production_pipeline.read", "production_pipeline.write", "production_pipeline.manage",
  ],
  accounts: [
    "titles.read",
    "contracts.read", "contracts.write",
    "dealers.read", "dealers.write",
    "sales.read", "sales.write",
    "stock.read", "print.read",
    "payouts.read", "payouts.write",
    "reports.read",
    "production_pipeline.read", "production_pipeline.write",
  ],
  store: [
    "titles.read", "titles.write",
    "authors.read", "dealers.read",
    "sales.read", "sales.write",
    "stock.read", "stock.write",
    "print.read", "reports.read",
    "production_pipeline.read", "production_pipeline.write",
  ],
  author: [
    "author_portal.access",
  ],
};

export function can(role: string | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  const roles = parseUserRoles(role);
  if (roles.includes("owner")) return true;
  return roles.some((r) => ROLE_CAPS[r]?.includes(cap) ?? false);
}


