// features/unified-data/table-page/heldArchive.ts — the ONE held-archive question every synced table asks (review 7 of the
// archive door). A sync that would archive a whole table, or more than the organization's share, archives nothing and
// names a confirmation ("<count>:<fingerprint>") for exactly those rows; the bar asks Archive / Keep. Keep is remembered
// on the server per fingerprint (custom.archive_hold_answer), so every device agrees and a later, different hold asks again.
import { supabase } from "@/utils/supabase/client";

export interface HeldArchive {
  /** Rows the source no longer lists that were NOT archived. */
  archive_held?: number | null;
  /** The exact confirmation for those rows. */
  archive_confirm?: string | null;
  /** The confirmation the person answered Keep to (server-side). */
  archive_kept?: string | null;
}

/** The hold to ask about, or null: none, or the person already kept exactly these rows. */
export function openHold(h: HeldArchive | null | undefined): { held: number; confirm: string } | null {
  if (!h?.archive_held || !h.archive_confirm || h.archive_kept === h.archive_confirm) return null;
  return { held: Number(h.archive_held), confirm: String(h.archive_confirm) };
}

const rows = (n: number) => `${n} ${n === 1 ? "row" : "rows"}`;

/** The one line: "<Source> no longer lists N rows. Archive them?" — or, when the hold changed under an Archive click,
 *  "<Source> no longer lists rows: now N rows (was M). Archive them?" */
export function heldSentence(source: string, held: number, was?: number | null): string {
  return was != null && was !== held
    ? `${source} no longer lists rows: now ${rows(held)} (was ${was}). Archive them?`
    : `${source} no longer lists ${rows(held)}. Archive them?`;
}

/** The person's answer, remembered on the table and its synced sources. "archive" records the yes a table_sync refresh spends. */
export async function answerHold(organizationId: string, tableId: string, answer: "keep" | "archive", token: string): Promise<void> {
  // custom.archive_hold_answer (migration 20261019130000) is newer than the generated database types
  const door = supabase.schema("custom") as unknown as {
    rpc: (fn: "archive_hold_answer", args: Record<string, string>) => PromiseLike<{ error: { message: string } | null }>;
  };
  const { error } = await door.rpc("archive_hold_answer", {
    p_organization_id: organizationId,
    p_table_id: tableId,
    p_answer: answer,
    p_token: token,
  });
  if (error) throw new Error(error.message);
}
