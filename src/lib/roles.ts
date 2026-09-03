/** Roles are enforced by a DB check constraint: users_role_valid. */
export const ROLES = ["owner", "editor", "production", "accounts", "store", "author"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(v: string): v is Role {
  return (ROLES as readonly string[]).includes(v);
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  editor: "Editor",
  production: "Production",
  accounts: "Accounts",
  store: "Store",
  author: "Author",
};

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
    "titles.read", "authors.read",
    "submissions.read", "submissions.review",
    "production_pipeline.read", "production_pipeline.write", "production_pipeline.manage",
  ],
  production: [
    "titles.read", "authors.read",
    "stock.read", "stock.write",
    "print.read", "print.write",
    "reports.read",
    "production_pipeline.read", "production_pipeline.write", "production_pipeline.manage",
  ],
  accounts: [
    "titles.read", "authors.read", "authors.write",
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

export function can(role: Role, cap: Capability): boolean {
  return ROLE_CAPS[role]?.includes(cap) ?? false;
}

