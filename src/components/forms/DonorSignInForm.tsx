"use client";

import { requestDonorLink } from "@/lib/donors/actions";
import { TextField } from "./fields";
import { SubmissionForm } from "./SubmissionForm";

export function DonorSignInForm() {
  return (
    <SubmissionForm
      action={requestDonorLink}
      labelledBy="signin-title"
      submitLabel="Email me a sign-in link"
      successTitle="Check your email"
      successBody="If an account exists for that address, we have sent a sign-in link. It works once and expires in 20 minutes."
    >
      {({ errors = {}, values = {} }) => (
        <TextField
          name="email"
          type="email"
          label="Email address used for your receipt"
          required
          autoComplete="email"
          defaultValue={values.email}
          error={errors.email}
        />
      )}
    </SubmissionForm>
  );
}
