// features/spaces/page/page-read.ts — opening one page never waits silently (ADVERSARIAL-8 F6).
//
// On 2026-10-22, with the database saturated, a fresh copy's Dashboard page drew nothing at all for the whole
// walk: the page's read never answered, and the page drew its empty "busy" frame forever; a read that failed drew
// "No Space here", which is not what happened either. The read now has a deadline, and a read that fails or
// times out is said (one sentence, Try again) — never blank, never "missing".

import { withDeadline } from "../templates/use-pack";

/** How long one page's read may take before the page says so. */
export const SPACE_PAGE_READ_DEADLINE_MS = 15_000;

export const PAGE_READ_SLOW = "This page took too long to open.";
export const PAGE_READ_FAILED = "This page couldn't be opened just now.";

export type PageRead<T> = { kind: "read"; doc: T | null } | { kind: "fault"; sentence: string };

/** The page's read with its deadline; a failure is a sentence for the person, never database text. */
export async function readPageWithDeadline<T>(read: () => PromiseLike<T | null>, ms = SPACE_PAGE_READ_DEADLINE_MS): Promise<PageRead<T>> {
  try {
    return { kind: "read", doc: await withDeadline(read(), ms, PAGE_READ_SLOW) };
  } catch (err) {
    if (err instanceof Error && err.message === PAGE_READ_SLOW) return { kind: "fault", sentence: PAGE_READ_SLOW };
    console.error("[spaces] the page could not be read", err);
    return { kind: "fault", sentence: PAGE_READ_FAILED };
  }
}
