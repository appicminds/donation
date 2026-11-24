import Link from "next/link";
import type { ServerProps } from "payload";
import { hasRole } from "../roles";

/** Sidebar link to the finance overview, shown to finance staff only. */
export function FinanceNavLink({ user }: ServerProps) {
  if (!hasRole(user as never, "finance")) return null;
  return (
    <Link href="/admin/finance" className="nav__link" style={{ display: "block", padding: "4px 0", fontWeight: 600 }}>
      Finance overview
    </Link>
  );
}
