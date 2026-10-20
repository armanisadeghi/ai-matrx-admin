// features/make/gallery/templatePageRead.ts — ONE TEMPLATE PAGE READ that survives a passing database blip
// (ADVERSARIAL-5 F3, 2026-10-20).
//
// Production template pages answered 500 four times in a row while PostgREST was restarting (PGRST002 "Could not query
// the database for the schema cache"): the page read threw on any error that was not "closed", and every visit was a
// live read. Now a transient error is asked once more after a short pause; if it still fails, the last good read of
// that template in this server process answers (a page a minute old beats an error page). Only when there is none
// does the page say "unavailable" in place — never a 500. A real missing template is still "missing" (the page 404s).
//
// Pure (no server-only import) so the classification and the fallback run under test with a mocked rpc.

import { closedReason } from "./publicGallery";
import { shapeTemplatePage, type PublicTemplatePage } from "./templatePage";

export interface DoorError {
  code?: string | null;
  message?: string | null;
  name?: string | null;
  details?: string | null;
}

/** Codes and words the database API answers when it is restarting, overloaded or unreachable — not when the key is wrong. */
const TRANSIENT_CODES = new Set(["PGRST000", "PGRST001", "PGRST002", "PGRST003", "57014", "57P01", "57P03", "53300", "08000", "08003", "08006", "40001", "40P01", "55P03"]);
const TRANSIENT_WORDS = /schema cache|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|timed out|timeout|Service Unavailable|Bad Gateway|Gateway Time-?out|\b50[234]\b/i;

export function isTransientDoorError(error: DoorError): boolean {
  if (TRANSIENT_CODES.has(error.code ?? "")) return true;
  if (error.name === "AbortError") return true;
  return TRANSIENT_WORDS.test(`${error.message ?? ""} ${error.details ?? ""}`);
}

export type TemplatePageRead =
  | { state: "open"; page: PublicTemplatePage; stale?: boolean }
  /** No published platform template answers to the key (or the door is closed to a guest): the page 404s. */
  | { state: "missing" }
  /** The database did not answer even after a retry, and this process has no earlier read of it. */
  | { state: "unavailable"; reason: string };

type PageRpc = (key: string) => PromiseLike<{ data: unknown; error: DoorError | null }>;

/** How long the one retry waits, and how many templates' last good reads a process keeps. */
export const TEMPLATE_PAGE_RETRY_MS = 400;
const LAST_GOOD_MAX = 500;

export function createTemplatePageReader(rpc: PageRpc, options: { retryMs?: number; sleep?: (ms: number) => Promise<void> } = {}) {
  const lastGood = new Map<string, PublicTemplatePage>();
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const keep = (key: string, page: PublicTemplatePage) => {
    lastGood.delete(key);
    lastGood.set(key, page);
    if (lastGood.size > LAST_GOOD_MAX) lastGood.delete(lastGood.keys().next().value as string);
  };
  const ask = async (key: string): Promise<{ data: unknown; error: DoorError | null }> => {
    try {
      return await rpc(key);
    } catch (thrown) {
      // A dropped connection rejects instead of answering an error: the same transient class.
      const e = thrown as { message?: string; name?: string };
      return { data: null, error: { message: e?.message ?? String(thrown), name: e?.name ?? null, code: null } };
    }
  };
  return async function read(key: string): Promise<TemplatePageRead> {
    let answer = await ask(key);
    if (answer.error && !closedReason(answer.error) && isTransientDoorError(answer.error)) {
      await sleep(options.retryMs ?? TEMPLATE_PAGE_RETRY_MS);
      answer = await ask(key);
    }
    const { data, error } = answer;
    if (!error) {
      const page = shapeTemplatePage(data);
      if (!page) return { state: "missing" };
      keep(key, page);
      return { state: "open", page };
    }
    if (closedReason(error)) return { state: "missing" };
    const reason = `${error.code ? `${error.code}: ` : ""}${error.message ?? "unknown error"}`;
    const kept = lastGood.get(key);
    if (kept) {
      console.warn(`[templates] the page read of ${key} failed (${reason}); showing the last good read.`);
      return { state: "open", page: kept, stale: true };
    }
    console.error(`[templates] the page read of ${key} failed (${reason}) and no earlier read is kept; the page says so in place.`);
    return { state: "unavailable", reason };
  };
}
