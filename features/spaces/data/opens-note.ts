// features/spaces/data/opens-note.ts — the line a database block draws when its table does not open.
//
// One decision for the live block (DataMount) and the server's seed (space-page-seed.server.ts): the server
// already asked where each table opens, so a block that will draw this note is known before the browser runs,
// and its first paint is the note's height — never the rows it had when it last painted (DB-BLOCK-CHROME-2).

/** What `readObjectOrganizationAnswer` says about a table, reduced to what the block draws. */
export type OpensState = "found" | "resolving" | "unavailable" | "not-given" | "archived" | string;

/**
 * The state a block draws from one `where_id_opens` answer. A table that was archived (its record is not
 * live) is found — the store says where it lives — but it does not open: the server drew its full frame
 * while the browser drew a refusal (Investors / Rounds, DB-BLOCK-CHROME-3). Both now draw its note.
 */
export function opensStateOf(answer: { state: OpensState; live?: boolean }): OpensState {
  return answer.state === "found" && answer.live === false ? "archived" : answer.state;
}

/** The note a block draws for a table that does not open; null when it opens (or is still being asked). */
export function opensNoteLine(state: OpensState): string | null {
  if (state === "found" || state === "resolving") return null;
  if (state === "archived") return "This database is archived.";
  return state === "unavailable" ? "This database can’t be opened right now." : "This database isn’t shared with you.";
}

/** Whether that note offers "Try again" (the store could not answer, so asking again may open it). */
export function opensNoteRetries(state: OpensState): boolean {
  return state === "unavailable";
}
