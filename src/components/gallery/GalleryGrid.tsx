"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryPhoto } from "@/content/gallery";
import { cn } from "@/lib/cn";

/**
 * Curated photo grid with an accessible lightbox (PRD §7.7, §11.3). The
 * native <dialog> gives focus containment and Escape-to-close. Arrow keys
 * move between photos, and focus returns to the opening thumbnail on close.
 */
export function GalleryGrid({ photos, className }: { photos: GalleryPhoto[]; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [index, setIndex] = useState<number | null>(null);

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const close = useCallback(() => dialogRef.current?.close(), []);
  const step = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () =>
      setIndex((i) => {
        if (i !== null) triggerRefs.current[i]?.focus();
        return null;
      });
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  const current = index === null ? null : photos[index];
  const many = photos.length > 1;

  return (
    <>
      <ul className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3", className)}>
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <figure>
              <button
                ref={(el) => {
                  triggerRefs.current[i] = el;
                }}
                type="button"
                onClick={() => open(i)}
                className="group block w-full overflow-hidden rounded-2xl bg-plum shadow-md ring-1 ring-ink/10"
                aria-haspopup="dialog"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="aspect-[4/3] w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <span className="sr-only">Open larger view</span>
              </button>
              {photo.caption && <figcaption className="mt-2 text-sm text-ink/75">{photo.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label="Photo viewer"
        onKeyDown={(e) => {
          if (!many) return;
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto max-h-[92dvh] w-[min(64rem,94vw)] overflow-visible bg-transparent p-0 text-white backdrop:bg-plum/90 backdrop:backdrop-blur-sm"
      >
        {current && (
          <figure className="relative">
            <Image
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              sizes="94vw"
              className="max-h-[80dvh] w-full rounded-2xl object-contain"
            />
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-sm text-white/85">
              <span>{current.caption ?? ""}</span>
              {many && (
                <span aria-live="polite">
                  {index! + 1} of {photos.length}
                </span>
              )}
            </figcaption>
          </figure>
        )}
        <div className="absolute -top-14 right-0 flex gap-2">
          {many && (
            <>
              <LightboxButton label="Previous photo" onClick={() => step(-1)} d="M12.5 5 7.5 10l5 5" />
              <LightboxButton label="Next photo" onClick={() => step(1)} d="M7.5 5l5 5-5 5" />
            </>
          )}
          <LightboxButton label="Close photo viewer" onClick={close} d="M5 5l10 10M15 5 5 15" autoFocus />
        </div>
      </dialog>
    </>
  );
}

function LightboxButton({
  label,
  onClick,
  d,
  autoFocus,
}: {
  label: string;
  onClick: () => void;
  d: string;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      autoFocus={autoFocus}
      className="inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
    >
      <span className="sr-only">{label}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d={d} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
