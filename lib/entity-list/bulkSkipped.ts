"use client";

// lib/entity-list/bulkSkipped.ts
//
// SKIPPED ROWS ARE NAMED — ALL OF THEM. A bulk verb that skipped rows says so in one toast: the
// first five by name, then "+N more" with a "Copy list" action that hands over every one (through
// the one copy door, `@ai-matrx/kit/clipboard`). When nothing succeeded the run throws
// `BulkNoneDoneError`, which carries the full list so the shell's error toast offers the same copy.
// Kept apart from `standardBulkActions` so the shell (EntityBulkBar) can read it without pulling
// the built-in verbs' service imports.

import { copyText } from "@ai-matrx/kit/clipboard";
import { toast } from "@/lib/toast";
import type { BulkSkip } from "./selection";

/** How many skipped rows a toast names inline; the rest are "+N more" with Copy list. */
export const SKIPPED_NAMED_INLINE = 5;

/** Every skipped row, one per line — what "Copy list" puts on the clipboard. */
export function skippedListText(skipped: readonly BulkSkip[]): string {
  return skipped.map((s) => `${s.name}: ${s.reason}`).join("\n");
}

/** The first five named inline, then "+N more". */
export function skippedLine(skipped: readonly BulkSkip[]): string {
  const named = skipped
    .slice(0, SKIPPED_NAMED_INLINE)
    .map((s) => `${s.name}: ${s.reason}`)
    .join(" · ");
  return skipped.length > SKIPPED_NAMED_INLINE ? `${named} · +${skipped.length - SKIPPED_NAMED_INLINE} more` : named;
}

/**
 * The toast action that hands over EVERY skipped row (names past the first five are otherwise
 * only counted). Through the one copy door (`@ai-matrx/kit/clipboard`). Null when all fit inline.
 */
export function copySkippedAction(skipped: readonly BulkSkip[]): { label: string; onClick: () => void } | null {
  if (skipped.length <= SKIPPED_NAMED_INLINE) return null;
  return {
    label: "Copy list",
    onClick: () => {
      void copyText(skippedListText(skipped), {
        successMessage: `Copied ${skipped.length} skipped`,
        notify: (message, kind) => (kind === "error" ? toast.error(message) : toast.success(message)),
      });
    },
  };
}

/**
 * NOTHING SUCCEEDED. The message names the first five; `skipped` carries every one, so the shell
 * can offer "Copy list" on the error toast and keep the whole selection.
 */
export class BulkNoneDoneError extends Error {
  readonly skipped: readonly BulkSkip[];
  constructor(message: string, skipped: readonly BulkSkip[]) {
    super(message);
    this.name = "BulkNoneDoneError";
    this.skipped = skipped;
  }
}

