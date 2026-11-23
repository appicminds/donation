"use client";

import { memoriesPage } from "@/content/copy";
import { submitContact, submitMemory, submitPhoto } from "@/lib/submissions/actions";
import { CONTACT_TOPICS, LIMITS } from "@/lib/submissions/validation";
import { CheckboxField, FileField, SelectField, TextArea, TextField } from "./fields";
import { SubmissionForm } from "./SubmissionForm";

const PHOTO_HINT = "JPEG, PNG or WebP, up to 4 MB. Location data and other hidden details are removed automatically.";

/** Memory submission (PRD §11.1). Public display is opt-in and unticked by default. */
export function MemoryForm({ photosEnabled }: { photosEnabled: boolean }) {
  return (
    <SubmissionForm
      action={submitMemory}
      labelledBy="share-title"
      submitLabel="Submit Memory"
      successTitle="Thank you"
      successBody="Thank you for sharing your memory of Comfort Kwaw. Your message has been received and will appear after review, if approved."
    >
      {({ errors = {}, values = {} }) => (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              name="name"
              label="Your name"
              autoComplete="name"
              defaultValue={values.name}
              error={errors.name}
              maxLength={LIMITS.name}
            />
            <TextField
              name="relationship"
              label="Your connection to Comfort"
              defaultValue={values.relationship}
              error={errors.relationship}
              maxLength={LIMITS.relationship}
              hint="For example: friend, neighbour, colleague."
            />
          </div>
          <TextArea
            name="message"
            label="Your message"
            required
            defaultValue={values.message}
            error={errors.message}
            maxLength={LIMITS.memory}
          />
          <TextField
            name="email"
            type="email"
            label="Your email"
            autoComplete="email"
            defaultValue={values.email}
            error={errors.email}
            hint="Only used to confirm we received your message. Never shown publicly."
          />
          {photosEnabled && (
            <fieldset className="space-y-4 rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
              <legend className="px-1 text-sm font-semibold text-ink">Add a photograph</legend>
              <FileField name="photo" label="Photograph" error={errors.photo} hint={PHOTO_HINT} />
              <CheckboxField
                name="photoRights"
                label="I have permission to share this photograph."
                defaultChecked={values.photoRights === "on"}
                error={errors.photoRights}
              />
            </fieldset>
          )}
          <div className="space-y-4">
            <CheckboxField
              name="publicConsent"
              label="I give permission for my message to appear publicly after family review."
              defaultChecked={values.publicConsent === "on"}
              error={errors.publicConsent}
            />
            <CheckboxField
              name="showName"
              label="Show my name and connection with my message."
              defaultChecked={values.showName === "on"}
              hint="If unticked, your message appears without your name."
            />
          </div>
          <p className="text-sm text-ink/75">{memoriesPage.moderation}</p>
        </>
      )}
    </SubmissionForm>
  );
}

/** Standalone photo sharing for the gallery (PRD §11.3). Private until approved. */
export function PhotoForm() {
  return (
    <SubmissionForm
      action={submitPhoto}
      labelledBy="share-photo-title"
      submitLabel="Share a Photograph"
      successTitle="Thank you"
      successBody="Your photograph has been received and will be reviewed by the family before it appears, if approved."
    >
      {({ errors = {}, values = {} }) => (
        <>
          <FileField name="photo" label="Photograph" required error={errors.photo} hint={PHOTO_HINT} />
          <TextField
            name="caption"
            label="About this photograph"
            defaultValue={values.caption}
            error={errors.caption}
            maxLength={LIMITS.caption}
            hint="Who is pictured, and when or where, if you know. The family will check captions before publishing."
          />
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              name="name"
              label="Your name"
              autoComplete="name"
              defaultValue={values.name}
              error={errors.name}
            />
            <TextField
              name="email"
              type="email"
              label="Your email"
              autoComplete="email"
              defaultValue={values.email}
              error={errors.email}
              hint="Never shown publicly."
            />
          </div>
          <div className="space-y-4">
            <CheckboxField
              name="rightsAttested"
              label="I have permission to share this photograph, including from anyone pictured where needed."
              defaultChecked={values.rightsAttested === "on"}
              error={errors.rightsAttested}
            />
            <CheckboxField
              name="publicConsent"
              label="I give permission for this photograph to appear publicly after family review."
              defaultChecked={values.publicConsent === "on"}
            />
          </div>
        </>
      )}
    </SubmissionForm>
  );
}

const TOPIC_LABELS: Record<(typeof CONTACT_TOPICS)[number], string> = {
  memorial: "Memorial message",
  payment: "Payment assistance",
  general: "General inquiry",
};

/** Contact form (PRD §8.3). */
export function ContactForm() {
  return (
    <SubmissionForm
      action={submitContact}
      labelledBy="contact-form-title"
      submitLabel="Send Message"
      successTitle="Message received"
      successBody="Thank you for reaching out. Your message has been received. We will respond as soon as we can."
    >
      {({ errors = {}, values = {} }) => (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              name="name"
              label="Full name"
              autoComplete="name"
              defaultValue={values.name}
              error={errors.name}
            />
            <TextField
              name="email"
              type="email"
              label="Email address"
              required
              autoComplete="email"
              defaultValue={values.email}
              error={errors.email}
            />
          </div>
          <SelectField
            name="topic"
            label="Topic"
            required
            defaultValue={values.topic}
            error={errors.topic}
            options={CONTACT_TOPICS.map((t) => ({ value: t, label: TOPIC_LABELS[t] }))}
          />
          <TextArea
            name="message"
            label="Your message"
            required
            defaultValue={values.message}
            error={errors.message}
            maxLength={LIMITS.contact}
          />
        </>
      )}
    </SubmissionForm>
  );
}
