"use client";

// features/hr/shared/HrEmployeePhoto.tsx — SPEC-EMPLOYEES §2.3.0, SPEC-ACCESS §3.1
//
// 🚨 A SIGNED URL IS A HANDOFF, NEVER AN IDENTITY.
//
// The record stores a `photo_file_id` — a file id, FK to `files.files(id)` — and
// NOTHING here stores, caches or persists a URL. The durable URL is built from
// the id at render time, contains only that id, and never expires. The bytes
// come through `useMediaSrc` — the media client's bearer-authenticated lane for
// private pixels, with its one load-recovery contract. A plain `<img>` bound to
// the byte route rode the files-session cookie instead, which a browser that
// blocks third-party cookies never sends (2026-10-22).
//
// That is the platform's file lane, not a local choice: `features/files/handler`
// eradicated presigned transport outright ("There is no presigned transport"),
// and a blocking guard in aidream (`scripts/check_signed_url_confinement.py`)
// exists to stop signed URLs crawling back in through "just one field".
//
// 🚨 INITIALS ARE THE NO-PHOTO STATE, AND THEY STAY. Both HR surfaces already
// rendered initials as the honest placeholder rather than a broken <img>. That
// was right, and it remains the fallback for three distinct cases the viewer
// cannot tell apart and does not need to: no photo on file, a viewer whose tier
// never received `photo_file_id`, and a photo whose bytes will not load.
//
// 🚨 THE SPEC SAYS WHERE THIS GOES, AND WHERE IT DOES NOT.
//   · §2.3.0 — the profile header, on every tab.
//   · SPEC-ACCESS §3.1 — the Directory tier's data contract includes the photo.
//   · The org chart's node type carries `photo_file_id`, but §5.2's prose does
//     NOT name a photo, so this is not wired there on a component's authority.
//   · No approval or decision surface mentions a photo, so it is not on one.

import { useMediaSrc } from "@ai-matrx/media/core";

import { cn } from "@/lib/utils";
// THE package initials formatter (`@ai-matrx/kit/format`, census H1
// 2026-09-07) — this file already computed first+last, identical to the
// package's recorded decision, so this is a byte-for-byte behavior match
// (the "—" fallback is passed through the package's own `fallback` option).
import { getInitials } from "@ai-matrx/kit/format";

/** First letters of the first and last word — the existing placeholder rule. */
export function hrInitials(name: string | null | undefined): string {
  return getInitials(name, { fallback: "—" });
}

export function HrEmployeePhoto({
  photoFileId,
  name,
  className,
  textClassName,
}: {
  /** `hr.employee.photo_file_id`. Absent for a viewer whose tier never got it. */
  photoFileId?: string | null;
  name: string | null | undefined;
  /** Size and shape come from the caller, so each surface keeps its own scale. */
  className?: string;
  textClassName?: string;
}) {
  const id = photoFileId?.trim() || null;
  const photo = useMediaSrc(id ? { file_id: id } : null);

  const shell = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
    className,
  );

  if (!id || photo.failed || !photo.src) {
    return (
      <div aria-hidden className={cn(shell, "font-medium text-muted-foreground", textClassName)}>
        {hrInitials(name)}
      </div>
    );
  }

  return (
    <div className={shell}>
      <img
        key={photo.retryKey}
        src={photo.src}
        alt={name ? `${name}'s photo` : "Employee photo"}
        className="h-full w-full object-cover"
        onError={photo.onLoadError}
      />
    </div>
  );
}
