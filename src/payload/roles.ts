/**
 * Admin roles (PRD §4). Least privilege: each account gets only what its job
 * needs. A person can hold several roles.
 */
export const ROLES = {
  super_admin: "Super administrator",
  publisher: "Content publisher",
  editor: "Content editor",
  legal_approver: "Legal / disclosure approver",
  moderator: "Content moderator",
  finance: "Finance administrator",
  support: "Support (contact messages)",
} as const;

export type Role = keyof typeof ROLES;

export const ROLE_OPTIONS = Object.entries(ROLES).map(([value, label]) => ({ value, label }));

type MaybeUser = { roles?: readonly string[] | null } | null | undefined;

export function hasRole(user: MaybeUser, ...roles: Role[]): boolean {
  const userRoles = user?.roles ?? [];
  if (userRoles.includes("super_admin")) return true;
  return roles.some((r) => userRoles.includes(r));
}

/** Strictly super admin. Roles granted to everyone else do not count. */
export function isSuperAdmin(user: MaybeUser): boolean {
  return Boolean(user?.roles?.includes("super_admin"));
}

export function isStaff(user: MaybeUser): boolean {
  return (user?.roles?.length ?? 0) > 0;
}
