"use client";

import Script from "next/script";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { getFormToken, type FormState } from "@/lib/submissions/actions";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const MAX_EDGE = 2400;

/**
 * Shrink large photos in the browser before upload, so phone pictures fit the
 * server's 4 MB limit. The server still validates and re-encodes everything;
 * this step only saves bandwidth.
 */
async function downscale(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= MAX_UPLOAD_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch {
    return file; // browser can't decode it (e.g. HEIC); let the server decide
  }
}

type Props = {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  successTitle: string;
  successBody: string;
  children: (state: FormState) => ReactNode;
  /** Visible id of the heading that names this form. */
  labelledBy: string;
};

export function SubmissionForm({ action, submitLabel, successTitle, successBody, children, labelledBy }: Props) {
  const [state, dispatch, pending] = useActionState(action, { status: "idle" } satisfies FormState);
  const [token, setToken] = useState("");
  const [preparing, setPreparing] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getFormToken().then(setToken, () => setToken(""));
  }, []);

  // Move focus to the outcome so screen-reader and keyboard users hear it.
  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
    else if (state.status === "error") statusRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl border-l-4 border-gold bg-white p-6 shadow-sm outline-none"
      >
        <p className="font-display text-2xl text-ink">{successTitle}</p>
        <p className="mt-2 text-ink/80">{successBody}</p>
      </div>
    );
  }

  const busy = pending || preparing;

  return (
    <form
      aria-labelledby={labelledBy}
      noValidate
      className="space-y-6"
      action={async (form: FormData) => {
        const photo = form.get("photo");
        if (photo instanceof File && photo.size > 0) {
          setPreparing(true);
          form.set("photo", await downscale(photo));
          setPreparing(false);
        }
        startTransition(() => dispatch(form));
      }}
    >
      {state.status === "error" && state.message && (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 outline-none"
        >
          {state.message}
        </div>
      )}

      {children(state)}

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input type="hidden" name="startedAt" value={token} />

      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="light" />
        </>
      )}

      <Button type="submit" arrow disabled={busy || !token} aria-disabled={busy || !token}>
        {busy ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
