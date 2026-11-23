import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminViewServerProps } from "payload";
import type { CSSProperties, ReactNode } from "react";
import { loadFinance, parseRange } from "@/lib/finance/load";
import { formatMoney } from "@/lib/money";
import { isVerifiedFinance } from "../endpoints/financeExport";

/**
 * Finance overview (PRD §12.2). Every figure stays in its own currency. The
 * USD-equivalent total appears only with the documented reporting rate.
 * Visible to finance staff with a TOTP-verified session.
 */
export async function FinanceDashboard({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  if (!req.user) redirect("/admin/login");

  const template = (children: ReactNode) => (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter>{children}</Gutter>
    </DefaultTemplate>
  );

  if (!(await isVerifiedFinance(req))) {
    return template(
      <>
        <h1>Finance</h1>
        <p>This page is available to finance administrators only.</p>
      </>,
    );
  }

  const sp = (searchParams ?? {}) as Record<string, string | undefined>;
  const range = parseRange({ from: sp.from, to: sp.to });
  const { summary, payments } = await loadFinance(req.payload, range);
  const qs = new URLSearchParams(Object.entries(range).filter(([, v]) => v) as [string, string][]).toString();
  const money = (minor: number, currency: string) => {
    const text = formatMoney({ amountMinor: minor, currency: currency as "USD" });
    // Symbols like $ and £ need the code for clarity; formats like "AED 227.28" already include it.
    return text.includes(currency) ? text : `${text} ${currency}`;
  };

  const { today, monthStart, yearStart, last30 } = quickRanges();

  return template(
    <div style={{ display: "grid", gap: 32, paddingBottom: 48 }}>
      <header>
        <h1 style={{ margin: 0 }}>Finance overview</h1>
        <p style={muted}>
          {range.from || range.to
            ? `Payments created ${range.from ?? "from the beginning"} to ${range.to ?? "today"} (UTC).`
            : "All payments (UTC)."}{" "}
          Amounts are shown in their own currency and never added together.
        </p>
      </header>

      <form method="get" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
        <label style={field}>
          From
          <input type="date" name="from" defaultValue={range.from} style={input} />
        </label>
        <label style={field}>
          To
          <input type="date" name="to" defaultValue={range.to} style={input} />
        </label>
        <button type="submit" className="btn btn--style-primary btn--size-small" style={{ margin: 0 }}>
          Apply
        </button>
        <nav aria-label="Quick ranges" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href={`?from=${monthStart}&to=${today}`}>This month</a>
          <a href={`?from=${last30}&to=${today}`}>Last 30 days</a>
          <a href={`?from=${yearStart}&to=${today}`}>This year</a>
          <a href="?">All time</a>
        </nav>
      </form>

      <section aria-labelledby="by-currency">
        <h2 id="by-currency">Honored, by charge currency</h2>
        <div style={grid}>
          {(["USD", "GBP"] as const).map((c) => {
            const t = summary.byCurrency[c];
            return (
              <Card key={c} title={`${c} gross`} value={money(t.grossMinor, c)}>
                <Line label="Successful payments" value={String(t.successfulCount)} />
                <Line label="Refunded" value={money(t.refundedMinor, c)} />
                <Line label="Less refunds" value={money(t.netOfRefundsMinor, c)} strong />
                {t.disputedCount > 0 && (
                  <Line label={`Disputed (${t.disputedCount})`} value={money(t.disputedMinor, c)} />
                )}
              </Card>
            );
          })}
          <Card
            title="Total honored (USD equivalent)"
            value={summary.usdEquivalent ? money(summary.usdEquivalent.totalMinor, "USD") : "Not calculated"}
          >
            {summary.usdEquivalent ? (
              <p style={muted}>
                Less refunds, at 1 GBP = {summary.usdEquivalent.basis.gbpToUsd} USD (
                {summary.usdEquivalent.basis.source}, {summary.usdEquivalent.basis.asOf}). A reporting view only: no
                payment was converted.
              </p>
            ) : (
              <p style={muted}>
                Set the reporting rate, its source and date in{" "}
                <Link href="/admin/globals/site-settings">Site settings</Link>.
              </p>
            )}
          </Card>
        </div>
      </section>

      <section aria-labelledby="settlement">
        <h2 id="settlement">Fees and net, by settlement currency</h2>
        <p style={muted}>From Stripe balance transactions. Net is after processing fees and before refunds.</p>
        <div style={grid}>
          {summary.settlement.length === 0 && <p style={muted}>No settled payments in this range yet.</p>}
          {summary.settlement.map((s) => (
            <Card key={s.currency} title={`Settled in ${s.currency}`} value={money(s.netMinor, s.currency)}>
              <Line label="Payments" value={String(s.count)} />
              <Line label="Gross settled" value={money(s.grossMinor, s.currency)} />
              <Line label="Processing fees" value={money(s.feeMinor, s.currency)} />
            </Card>
          ))}
        </div>
        {summary.awaitingSettlement > 0 && (
          <p style={muted}>
            {summary.awaitingSettlement} successful payment(s) are still waiting for Stripe’s settlement figures.
          </p>
        )}
      </section>

      <section aria-labelledby="activity">
        <h2 id="activity">Activity</h2>
        <div style={grid}>
          <Card title="Honoring supporters" value={String(summary.supporters)}>
            <p style={muted}>
              Distinct contributor emails on successful payments. Public names are shown only with consent.
            </p>
          </Card>
          <Card title="Pending payments" value={String(summary.pendingCount)}>
            <p style={muted}>Started but not yet confirmed by Stripe.</p>
          </Card>
          <Card title="Failed or canceled" value={String(summary.unsuccessfulCount)}>
            <p style={muted}>No money was collected for these.</p>
          </Card>
        </div>
      </section>

      <section aria-labelledby="exports">
        <h2 id="exports">Export for the accountant</h2>
        <p style={muted}>
          {payments.length} payment(s) in this range. Exports include separate USD and GBP columns, settlement figures,
          Stripe references and the reporting rate. Each export is recorded in the audit log.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            className="btn btn--style-primary btn--size-small"
            style={{ margin: 0 }}
            href={`/api/payments/export?format=xlsx${qs ? `&${qs}` : ""}`}
          >
            Download Excel (.xlsx)
          </a>
          <a
            className="btn btn--style-secondary btn--size-small"
            style={{ margin: 0 }}
            href={`/api/payments/export?format=csv${qs ? `&${qs}` : ""}`}
          >
            Download CSV
          </a>
          <Link href="/admin/collections/payments" style={{ alignSelf: "center" }}>
            Browse payments →
          </Link>
        </div>
      </section>
    </div>,
  );
}

/** Dates for the quick-range links, in UTC. */
function quickRanges() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  return {
    today,
    monthStart: `${today.slice(0, 8)}01`,
    yearStart: `${today.slice(0, 4)}-01-01`,
    last30: new Date(now.getTime() - 29 * 86_400_000).toISOString().slice(0, 10),
  };
}

const muted: CSSProperties = { color: "var(--theme-elevation-600)", margin: "4px 0 0" };
const grid: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  marginTop: 12,
};
const field: CSSProperties = { display: "grid", gap: 4, fontSize: 13 };
const input: CSSProperties = {
  padding: "6px 10px",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 4,
  background: "var(--theme-input-bg)",
  color: "var(--theme-text)",
};

function Card({ title, value, children }: { title: string; value: string; children?: ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--theme-elevation-100)",
        borderRadius: 8,
        padding: 16,
        background: "var(--theme-elevation-0)",
      }}
    >
      <div style={{ fontSize: 13, color: "var(--theme-elevation-600)" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 600, margin: "4px 0 8px" }}>{value}</div>
      {children}
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        fontSize: 14,
        fontWeight: strong ? 600 : 400,
        padding: "2px 0",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
