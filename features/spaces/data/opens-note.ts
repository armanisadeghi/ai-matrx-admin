// features/spaces/data/opens-note.ts — the line a database block draws when its table does not open.
//
// One decision for the live block (DataMount) and the server's seed (space-page-seed.server.ts): the server
// already asked where each table opens, so a block that will draw this note is known before the browser runs,
// and its first paint is the note's height — never the rows it had when it last painted (DB-BLOCK-CHROME-2).

/** What `readObjectOrganizationAnswer` says about a table, reduced to what the block draws. */
export type OpensState = "found" | "resolving" | "unavailable" | "not-given" | string;

/** The note a block draws for a table that does not open; null when it opens (or is still being asked). */
export function opensNoteLine(state: OpensState): string | null {
  if (state === "found" || state === "resolving") return null;
  return state === "unavailable" ? "This database can’t be opened right now." : "This database isn’t shared with you.";
}

/** Whether that note offers "Try again" (the store could not answer, so asking again may open it). */
export function opensNoteRetries(state: OpensState): boolean {
  return state === "unavailable";
}
