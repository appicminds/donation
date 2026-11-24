"use client";

import { requestDonorCode, setDonorPassword, signInWithPassword, verifyDonorCode } from "@/lib/donors/actions";
import { TextField } from "./fields";
import { SubmissionForm } from "./SubmissionForm";

// Each of these actions redirects on success, so the success panel is only a fallback.
const done = { successTitle: "Done", successBody: "Please continue." };

/** Step 1 of code sign-in: the receipt email address (A1-14). */
export function DonorSignInForm({ email }: { email?: string }) {
  return (
    <SubmissionForm action={requestDonorCode} labelledBy="signin-title" submitLabel="Email me a sign-in code" {...done}>
      {({ errors = {}, values = {} }) => (
        <TextField
          name="email"
          type="email"
          label="Email address used for your receipt"
          required
          autoComplete="email"
          defaultValue={values.email ?? email}
          error={errors.email}
        />
      )}
    </SubmissionForm>
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

/** Optional password sign-in (A1-16). */
export function DonorPasswordForm({ email }: { email?: string }) {
  return (
    <SubmissionForm action={signInWithPassword} labelledBy="password-title" submitLabel="Sign in" {...done}>
      {({ errors = {}, values = {} }) => (
        <>
          <TextField
            name="email"
            type="email"
            label="Email address"
            required
            autoComplete="username"
            defaultValue={values.email ?? email}
            error={errors.email}
          />
          <TextField
            name="password"
            type="password"
            label="Password"
            required
            autoComplete="current-password"
            maxLength={128}
            error={errors.password}
          />
        </>
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
