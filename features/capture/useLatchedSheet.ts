"use client";

// features/capture/useLatchedSheet.ts — A SHEET THAT OPENED STAYS OPEN WHEN THE SIGNAL GOES.
//
// The capture route draws the sheet from `useObjectOrganization` (which organization the sheet lives in).
// Once that answered "found", the phone holds everything it needs; a later "the record store did not answer"
// (the phone walked into a basement and the kept answer was asked again) must never swap the running sheet
// for an apology — that unmounts the question the person is typing into (AT-FIX-I, 2026-10-19).

import { useRef } from "react";
import type { ObjectOrganizationView } from "@/features/unified-data/objectOrganization";

type SheetView = ObjectOrganizationView & { retry: () => void };

/** Pure half: the answer to draw, given the last one that was "found" (if any). */
export function latchedSheet(held: SheetView | null, now: SheetView): SheetView {
  if (now.state === "found") return now;
  if (held && held.state === "found") return { ...held, retry: now.retry };
  return now;
}

export function useLatchedSheet(now: SheetView): SheetView {
  const held = useRef<SheetView | null>(null);
  const shown = latchedSheet(held.current, now);
  if (shown.state === "found") held.current = shown;
  return shown;
}
