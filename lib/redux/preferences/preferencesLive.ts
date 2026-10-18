/**
 * Live updates for the person's saved preferences (users.user_preferences): the pure half.
 *
 * Preferences are no longer re-read on a timer. A change made anywhere (another tab, a device,
 * an agent) reaches this tab as a realtime row; this module decides whether that row is news.
 *
 * Echo suppression: our own save comes back as a realtime row 50-500 ms after its response. The row's
 * `version` (bumped on every update) is the evidence: a version we have already seen or written is
 * dropped, so a save never costs a re-read and cannot loop back through autosave.
 */

/** A tab left in the background this long re-reads once when it becomes visible again (a knob). */
export const PREFERENCES_REVALIDATE_AFTER_ABSENCE_MS = 30 * 60 * 1000;

/** Versions this tab wrote or already re-read; a row naming one is an echo or a repeat. Bounded. */
const handledVersions: number[] = [];
const HANDLED_LIMIT = 50;

function remember(version: number): void {
  if (handledVersions.includes(version)) return;
  handledVersions.push(version);
  if (handledVersions.length > HANDLED_LIMIT) handledVersions.shift();
}

/** Record the version this tab's own save produced, so its realtime echo is dropped. */
export function noteOwnPreferencesWrite(version: unknown): void {
  if (typeof version === "number" && Number.isFinite(version)) remember(version);
}

/**
 * Is this realtime row news? A row with no readable version is news (degrade to re-reading, never to dropping).
 * Exact match, not "at or below the highest": a collaborator's version 6 arriving after our own save made 7
 * still carries keys this tab has not seen.
 */
export function preferencesRowIsNews(row: Record<string, unknown> | null | undefined): boolean {
  const version = row?.version;
  if (typeof version !== "number" || !Number.isFinite(version)) return true;
  if (handledVersions.includes(version)) return false;
  remember(version);
  return true;
}

/** A new sign-in starts from nothing: another account's version numbers say nothing here. */
export function resetPreferencesVersions(): void {
  handledVersions.length = 0;
}
