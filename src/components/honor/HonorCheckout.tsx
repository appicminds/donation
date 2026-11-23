"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
// "pure" defers loading Stripe.js until checkout reaches the payment step.
import type { Stripe as StripeJs } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CheckboxField, TextArea, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { paymentCopy } from "@/content/copy";
import type { AmountLimits } from "@/lib/honor";
import { formatMoney, toMinor, type Currency } from "@/lib/money";
import { startHonor } from "@/lib/payments/actions";
import { HonorForm, type AmountSelection } from "./HonorForm";

export type Disclosures = {
  legalRecipient: string | null;
  paymentClassification: string | null;
  purposeDisclosure: string | null;
  taxStatement: string;
  refundPolicy: string | null;
};

type Session = { clientSecret: string; receiptRef: string; token: string; amountMinor: number; currency: Currency };
type Details = { name: string; email: string; note: string; showName: boolean };

const PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: Promise<StripeJs | null> | null = null;
const getStripe = () => (stripePromise ??= PK ? loadStripe(PK) : Promise.resolve(null));

const STEPS = ["Amount", "Your details", "Review and pay"] as const;

/** The Honor checkout: amount → details → review and secure payment (PRD §9.3). */
export function HonorCheckout({
  currencies,
  paymentsEnabled,
  limits,
  disclosures,
}: {
  currencies: readonly Currency[];
  paymentsEnabled: boolean;
  limits: AmountLimits;
  disclosures: Disclosures;
}) {
  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<AmountSelection | null>(null);
  const [details, setDetails] = useState<Details>({ name: "", email: "", note: "", showName: false });
  const [session, setSession] = useState<Session | null>(null);
  // One key per checkout attempt: resubmitting resumes the same payment instead of charging twice.
  // Created lazily on first submit (not during prerender).
  const attemptKey = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step > 0) headingRef.current?.focus();
  }, [step]);

  const canPay = paymentsEnabled && Boolean(PK);

  return (
    <div>
      {canPay && (
        <ol className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Checkout progress">
          {STEPS.map((label, i) => (
            <li
              key={label}
              aria-current={i === step ? "step" : undefined}
              className={i === step ? "font-semibold text-violet" : i < step ? "text-ink/80" : "text-ink/75"}
            >
              <span aria-hidden="true">{i + 1}. </span>
              {label}
            </li>
          ))}
        </ol>
      )}

      {step === 0 && (
        <>
          {paymentsEnabled && !PK && (
            <Notice className="mb-6" title="Payments are temporarily unavailable">
              Please try again later.
            </Notice>
          )}
          <HonorForm
            currencies={currencies}
            paymentsEnabled={canPay}
            limits={limits}
            initial={selection}
            onContinue={(s) => {
              if (session && (s.currency !== selection?.currency || s.amount !== selection?.amount)) {
                setSession(null);
                attemptKey.current = null;
              }
              setSelection(s);
              setStep(1);
            }}
          />
        </>
      )}

      {step === 1 && selection && (
        <DetailsStep
          headingRef={headingRef}
          selection={selection}
          details={details}
          onBack={() => setStep(0)}
          onSubmit={async (d) => {
            setDetails(d);
            const result = await startHonor({
              currency: selection.currency,
              amount: String(selection.amount),
              name: d.name,
              email: d.email,
              note: d.note,
              showName: d.showName,
              idempotencyKey: (attemptKey.current ??= crypto.randomUUID()),
            });
            if (!result.ok) return result;
            setSession(result);
            setStep(2);
            return null;
          }}
        />
      )}

      {step === 2 && session && (
        <Elements
          stripe={getStripe()}
          options={{
            clientSecret: session.clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#70228a",
                colorText: "#32133d",
                colorDanger: "#991b1b",
                borderRadius: "12px",
                fontFamily: "Inter, system-ui, sans-serif",
              },
            },
          }}
        >
          <PayStep
            headingRef={headingRef}
            session={session}
            details={details}
            disclosures={disclosures}
            onBack={() => setStep(1)}
          />
        </Elements>
      )}
    </div>
  );
}

function DetailsStep({
  headingRef,
  selection,
  details,
  onBack,
  onSubmit,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  selection: AmountSelection;
  details: Details;
  onBack: () => void;
  onSubmit: (d: Details) => Promise<{ message: string; errors?: Record<string, string> } | null>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  return (
    <form
      aria-labelledby={titleId}
      noValidate
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const d: Details = {
          name: String(f.get("name") ?? ""),
          email: String(f.get("email") ?? ""),
          note: String(f.get("note") ?? ""),
          showName: f.get("showName") === "on",
        };
        setBusy(true);
        const problem = await onSubmit(d).catch(() => ({
          message: "Something went wrong. Please try again in a moment.",
        }));
        setBusy(false);
        if (problem) {
          setMessage(problem.message);
          setErrors("errors" in problem && problem.errors ? problem.errors : {});
          requestAnimationFrame(() => alertRef.current?.focus());
        }
      }}
    >
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className="text-3xl text-ink outline-none">
        Your details
      </h2>
      <p className="text-ink/80">
        Honoring with{" "}
        <strong>
          {formatMoney({ amountMinor: toMinor(selection.amount), currency: selection.currency })} {selection.currency}
        </strong>
        .{" "}
        <button type="button" onClick={onBack} className="text-violet underline underline-offset-4">
          Change amount
        </button>
      </p>
      {message && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 outline-none"
        >
          {message}
        </div>
      )}
      {(errors.amount || errors.currency) && (
        <p className="text-sm font-medium text-red-800">{errors.amount ?? errors.currency}</p>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField name="name" label="Your name" autoComplete="name" defaultValue={details.name} error={errors.name} />
        <TextField
          name="email"
          type="email"
          label="Email for your receipt"
          required
          autoComplete="email"
          defaultValue={details.email}
          error={errors.email}
        />
      </div>
      <TextArea
        name="note"
        label="A memorial note"
        rows={3}
        maxLength={500}
        defaultValue={details.note}
        error={errors.note}
        hint="Seen only by the family."
      />
      <CheckboxField
        name="showName"
        label="The family may display my name publicly as someone who honored Comfort."
        defaultChecked={details.showName}
        hint="Unticked by default: your contribution stays private. Amounts are never shown publicly."
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" arrow disabled={busy}>
          {busy ? "Preparing secure payment…" : "Continue to Secure Payment"}
        </Button>
        <Button type="button" variant="outline-dark" onClick={onBack}>
          Back
        </Button>
      </div>
    </form>
  );
}

const DECLINED =
  "Your payment could not be completed. Please check your details or try another payment method. You have not been charged unless your bank confirms otherwise.";

function PayStep({
  headingRef,
  session,
  details,
  disclosures,
  onBack,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  session: Session;
  details: Details;
  disclosures: Disclosures;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const amount = formatMoney({ amountMinor: session.amountMinor, currency: session.currency });
  const confirmPath = `/honor/confirmation?ref=${encodeURIComponent(session.receiptRef)}&t=${encodeURIComponent(session.token)}`;

  return (
    <form
      aria-labelledby={titleId}
      className="space-y-8"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stripe || !elements || busy) return;
        setBusy(true);
        setError(null);
        const submitted = await elements.submit();
        if (submitted.error) {
          setBusy(false);
          setError(submitted.error.message ?? DECLINED);
          return;
        }
        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: `${window.location.origin}${confirmPath}` },
          redirect: "if_required",
        });
        if (confirmError) {
          setBusy(false);
          if (confirmError.code === "payment_intent_unexpected_state") {
            setError(
              "This payment may already have been submitted. Please check your confirmation email before trying again.",
            );
          } else if (confirmError.type === "card_error" || confirmError.type === "validation_error") {
            setError(confirmError.type === "card_error" ? DECLINED : (confirmError.message ?? DECLINED));
          } else {
            setError("For your security, this payment session has expired. Please start again.");
          }
          return;
        }
        // No redirect was needed. The confirmation page waits for the verified webhook.
        router.push(confirmPath);
      }}
    >
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className="text-3xl text-ink outline-none">
        Review Your Honor
      </h2>

      <dl className="divide-y divide-ink/10 rounded-2xl bg-white px-5 shadow-sm ring-1 ring-ink/5">
        <Row term="Amount" value={`${amount} ${session.currency} · one-time`} strong />
        <Row term="Total charge" value={`${amount} ${session.currency}. No additional fees are added by the fund.`} />
        <Row term="Recipient" value={disclosures.legalRecipient ?? "—"} />
        <Row term="Payment classification" value={disclosures.paymentClassification ?? "—"} />
        <Row term="Purpose" value={disclosures.purposeDisclosure ?? "—"} />
        <Row term="Tax status" value={disclosures.taxStatement} />
        <Row term="Refunds and support" value={disclosures.refundPolicy ?? "—"} />
        <Row term="Name shown publicly" value={details.showName && details.name ? details.name : "No (private)"} />
        <Row term="Receipt sent to" value={details.email} />
      </dl>
      <p className="text-sm text-ink/75">{paymentCopy.fxNote}</p>

      <div>
        <p className="mb-3 text-sm font-semibold text-ink">Payment details</p>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ink/5">
          <PaymentElement onReady={() => setReady(true)} options={{ layout: "tabs" }} />
        </div>
        <p className="mt-2 text-xs text-ink/70">
          Card details are entered securely with Stripe and never reach the fund’s servers.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          {error}
        </div>
      )}
      {busy && (
        <p role="status" className="text-sm font-medium text-violet">
          We are securely processing your payment. Please do not close this page.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" arrow disabled={!stripe || !ready || busy}>
          Honor Comfort Kwaw
        </Button>
        <Button type="button" variant="outline-dark" onClick={onBack} disabled={busy}>
          Back
        </Button>
      </div>
      <p className="text-xs text-ink/70">Receipt reference: {session.receiptRef}</p>
    </form>
  );
}

function Row({ term, value, strong }: { term: string; value: string; strong?: boolean }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-ink/80">{term}</dt>
      <dd className={strong ? "font-display text-2xl text-ink" : "text-sm text-ink"}>{value}</dd>
    </div>
  );
}
