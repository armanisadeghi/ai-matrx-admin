"use client";

// features/make/gallery/GalleryTimedOut.tsx — LANE AT-FIX-H3 (2026-10-19).
//
// The public gallery's catalog read ran past the database's time limit. The page used to crash whole ("This page
// stopped working"); now the results area says so in place — the shared timed-out sentence with Try again — in the
// same box the cards fill (min height, so nothing below or beside it moves), and asks ONE more time by itself.
// Nothing here is a copy of the sentence: it is the design system's TIMED_OUT_SENTENCE, drawn by its ErrorNotice.

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button } from "@/components/ui/button";

/** How long the page waits before its one automatic second ask. */
export const GALLERY_RETRY_PAUSE_MS = 1500;

export function GalleryTimedOut() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [autoTried, setAutoTried] = useState(false);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const id = setTimeout(() => {
      setAutoTried(true);
      start(() => router.refresh());
    }, GALLERY_RETRY_PAUSE_MS);
    return () => clearTimeout(id);
  }, [router]);

  return (
    <div className="min-h-[70vh]" data-public-templates-timed-out={autoTried ? "retried" : "waiting"}>
      <ErrorNotice
        size="compact"
        error={{ code: "timed_out" }}
        operation="read the template gallery"
        actions={
          <Button type="button" variant="outline" data-error-retry="" disabled={pending} onClick={() => start(() => router.refresh())}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
