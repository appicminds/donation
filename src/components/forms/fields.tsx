"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const inputBase =
  "w-full rounded-xl border border-ink/20 bg-white px-4 text-base text-ink shadow-sm outline-none transition-colors focus:border-violet focus:ring-2 focus:ring-violet/30 aria-invalid:border-red-700";

type Common = { name: string; label: string; error?: string; hint?: ReactNode; required?: boolean; className?: string };

function Label({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-ink">
      {label}
      {required ? (
        <span className="text-red-800" aria-hidden="true">
          {" "}
          *
        </span>
      ) : (
        <span className="font-normal text-ink/75"> (optional)</span>
      )}
    </label>
  );
}

function Describe({ id, hint, error }: { id: string; hint?: ReactNode; error?: string }) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-sm text-ink/70">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: string) =>
  [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

export function TextField({
  name,
  label,
  error,
  hint,
  required,
  className,
  type = "text",
  defaultValue,
  autoComplete,
  maxLength,
  inputMode,
  onChange,
}: Common & {
  type?: "text" | "email" | "password";
  defaultValue?: string;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: "numeric" | "text" | "email";
  onChange?: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={required} />
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(inputBase, "min-h-12")}
      />
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function TextArea({
  name,
  label,
  error,
  hint,
  required,
  className,
  defaultValue,
  maxLength,
  rows = 6,
}: Common & { defaultValue?: string; maxLength: number; rows?: number }) {
  const id = useId();
  const [count, setCount] = useState(defaultValue?.length ?? 0);
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={required} />
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        onChange={(e) => setCount(e.target.value.length)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[describedBy(id, hint, error), `${id}-count`].filter(Boolean).join(" ")}
        className={cn(inputBase, "py-3 leading-relaxed")}
      />
      <p id={`${id}-count`} className="mt-1 text-right text-xs text-ink/70">
        {count} / {maxLength} characters
      </p>
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  error,
  hint,
  required,
  className,
  defaultValue,
  options,
}: Common & { defaultValue?: string; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={required} />
      <select
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(inputBase, "min-h-12")}
      >
        <option value="" disabled>
          Choose a topic
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  error,
  hint,
  className,
  defaultChecked,
}: Omit<Common, "required"> & { defaultChecked?: boolean }) {
  const id = useId();
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className="mt-0.5 size-5 shrink-0 accent-violet"
        />
        <label htmlFor={id} className="text-sm text-ink">
          {label}
        </label>
      </div>
      <div className="pl-8">
        <Describe id={id} hint={hint} error={error} />
      </div>
    </div>
  );
}

export function FileField({ name, label, error, hint, required, className }: Common) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={required} />
      <input
        id={id}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className="block w-full text-sm text-ink file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-full file:border-0 file:bg-royal file:px-5 file:font-semibold file:text-white hover:file:bg-violet"
      />
      <Describe id={id} hint={hint} error={error} />
    </div>
  );
}
