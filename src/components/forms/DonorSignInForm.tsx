"use client";

import { useEffect, useRef, useState } from "react";
import { requestDonorCode, setDonorPassword, signInWithPassword, verifyDonorCode } from "@/lib/donors/actions";
import { TextField } from "./fields";
import { SubmissionForm } from "./SubmissionForm";

// Each of these actions redirects on success, so the success panel is only a fallback.
const done = { successTitle: "Done", successBody: "Please continue." };

/**
 * One sign-in form (A1-14, A1-16): an email address, sent a code by default.
 * "Use my password instead" switches the same form to a password field, keeping
 * the email. Nobody has to choose before they know what the options mean.
 */
export function DonorSignInForm({ email: initial }: { email?: string }) {
  const [mode, setMode] = useState<"code" | "password">("code");
  const [email, setEmail] = useState(initial ?? "");
  const [focusField, setFocusField] = useState<"email" | "password" | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // After switching, put keyboard focus where the person needs to type next (once).
  useEffect(() => {
    if (focusField) box.current?.querySelector<HTMLInputElement>(`input[name="${focusField}"]`)?.focus();
  }, [mode, focusField]);
  const switchTo = (next: "code" | "password") => (
    <button
      type="button"
      onClick={() => {
        setFocusField(next === "password" && email ? "password" : "email");
        setMode(next);
      }}
      className="text-sm font-medium text-violet underline underline-offset-4 hover:text-plum"
    >
      {next === "password" ? "Use my password instead" : "Email me a code instead"}
    </button>
  );

  if (mode === "password") {
    return (
      <div ref={box} className="space-y-5">
        <SubmissionForm action={signInWithPassword} labelledBy="signin-title" submitLabel="Sign in" {...done}>
          {({ errors = {}, values = {} }) => (
            <>
              <TextField
                name="email"
                type="email"
                label="Email address"
                required
                autoComplete="username"
                defaultValue={values.email ?? email}
                onChange={setEmail}
                error={errors.email}
              />
              <TextField
                name="password"
                type="password"
                label="Password"
                required
                autoComplete="current-password"
                maxLength={128}
                hint="Forgotten it? Email yourself a code instead."
                error={errors.password}
              />
            </>
          )}
        </SubmissionForm>
        {switchTo("code")}
      </div>
    );
  }

  return (
    <div ref={box} className="space-y-5">
      <SubmissionForm
        action={requestDonorCode}
        labelledBy="signin-title"
        submitLabel="Email me a sign-in code"
        {...done}
      >
        {({ errors = {}, values = {} }) => (
          <TextField
            name="email"
            type="email"
            label="Email address"
            required
            autoComplete="email"
            defaultValue={values.email ?? email}
            onChange={setEmail}
            hint="The one you used for your receipt. We'll email you a 6-digit code."
            error={errors.email}
          />
        )}
      </SubmissionForm>
      <p className="text-sm text-ink/75">Added a password to your account? {switchTo("password")}</p>
    </div>
  );
}

/** Step 2 of code sign-in: the 6-digit code from the email. */
export function DonorCodeForm() {
  return (
    <SubmissionForm action={verifyDonorCode} labelledBy="code-title" submitLabel="Sign in" {...done}>
      {({ errors = {} }) => (
        <TextField
          name="code"
          label="6-digit code"
          required
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={7}
          hint="Check your inbox, and your spam folder, for an email from the Comfort Kwaw Memorial Fund."
          error={errors.code}
        />
      )}
    </SubmissionForm>
  );
}

/** Set or change the optional password (A1-15). */
export function DonorSetPasswordForm({ changing }: { changing: boolean }) {
  return (
    <SubmissionForm
      action={setDonorPassword}
      labelledBy="set-password-title"
      submitLabel={changing ? "Change password" : "Save password"}
      {...done}
    >
      {({ errors = {} }) => (
        <>
          <TextField
            name="password"
            type="password"
            label={changing ? "New password" : "Password"}
            required
            autoComplete="new-password"
            maxLength={128}
            hint="At least 10 characters. A short sentence you'll remember works well."
            error={errors.password}
          />
          <TextField
            name="confirm"
            type="password"
            label="Type it again"
            required
            autoComplete="new-password"
            maxLength={128}
          />
        </>
      )}
    </SubmissionForm>
  );
}
