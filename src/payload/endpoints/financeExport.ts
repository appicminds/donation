import type { Endpoint, PayloadRequest } from "payload";
import { totpAccess } from "payload-totp";
import { toCsv, toXlsx } from "@/lib/finance/export";
import { loadFinance, parseRange } from "@/lib/finance/load";
import { hasRole } from "../roles";

/** Finance role AND a TOTP-verified session (custom endpoints are not wrapped by the plugin). */
export async function isVerifiedFinance(req: PayloadRequest): Promise<boolean> {
  if (!req.user) return false;
  const allowed = await totpAccess(({ req: r }) => hasRole(r.user, "finance"))({ req } as never);
  return allowed === true;
}

/**
 * GET /api/payments/export?format=csv|xlsx&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Accountant export (PRD §12.3). Every export is written to the audit log.
 */
export const financeExport: Endpoint = {
  path: "/export",
  method: "get",
  handler: async (req) => {
    if (!(await isVerifiedFinance(req))) {
      return Response.json({ errors: [{ message: "You are not allowed to perform this action." }] }, { status: 403 });
    }
    const url = new URL(req.url ?? "http://localhost");
    const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const range = parseRange({ from: url.searchParams.get("from"), to: url.searchParams.get("to") });

    const { payments, summary, fx } = await loadFinance(req.payload, range);
    const meta = {
      range,
      generatedAt: new Date(),
      generatedBy: String((req.user as { email?: string }).email ?? req.user!.id),
      fx,
    };

    await req.payload.create({
      collection: "audit-logs",
      overrideAccess: true,
      req,
      data: {
        actor: req.user!.id,
        actorLabel: meta.generatedBy,
        action: "export",
        entity: "payments",
        summary: `${format.toUpperCase()} export, ${payments.length} payments, ${range.from ?? "beginning"} to ${range.to ?? "today"}`,
      },
    });

    const stamp = `${range.from ?? "all"}_to_${range.to ?? meta.generatedAt.toISOString().slice(0, 10)}`;
    const headers = {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    };
    if (format === "xlsx") {
      const body = await toXlsx(payments, summary, meta);
      return new Response(new Uint8Array(body), {
        headers: {
          ...headers,
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename="comfort-kwaw-payments_${stamp}.xlsx"`,
        },
      });
    }
    return new Response(toCsv(payments, meta), {
      headers: {
        ...headers,
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="comfort-kwaw-payments_${stamp}.csv"`,
      },
    });
  },
};
