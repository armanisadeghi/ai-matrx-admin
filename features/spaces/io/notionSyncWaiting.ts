/**
 * "Sync now" while the table's own import is running: the server answers 202 at once
 * (`{status: "waiting", message: "Waiting for the import of <table> to finish", operation:
 * {link_kind: "notion_sync", link_id: <table id>}}`) and runs the sync as a tracked background
 * run right after the import. The bar says the server's sentence and follows that run through
 * the one run contract (`runtime.global_execution` by link, `fetchOperationsByLink`) to its end.
 */
import { fetchOperationsByLink, type LinkedOperation, type OperationsByLink } from "@/lib/runtime-operations/operationsByLink";

export const SYNC_LINK_KIND = "notion_sync";

export interface NotionSyncWaiting {
  status: "waiting";
  message: string;
  operation?: { link_kind: string; link_id: string } | null;
}

export function isSyncWaiting(answer: unknown): answer is NotionSyncWaiting {
  return Boolean(answer && typeof answer === "object" && (answer as { status?: unknown }).status === "waiting");
}

type Read = (linkKind: string, linkId: string) => Promise<OperationsByLink>;

export interface FollowOptions {
  /** Epoch ms of the press: an older settled run is never taken for this one. */
  since: number;
  every?: number;
  signal?: AbortSignal;
  read?: Read;
  sleep?: (ms: number) => Promise<void>;
  /** The longest the bar follows before it says so (the import it waits for may itself run 2 h). Default 3 h. */
  ceilingMs?: number;
  now?: () => number;
}

/** The follow ran out of time with no settled run for this press: the bar must stop spinning and say so. */
export class SyncFollowTimedOut extends Error {
  constructor() {
    super("The sync has not reported back. Reload to look again, or press Sync now.");
    this.name = "SyncFollowTimedOut";
  }
}

export const SYNC_FOLLOW_CEILING_MS = 3 * 60 * 60 * 1000;

/** Runs and the browser keep clocks a little apart; a run made this long before the press still counts. */
const SKEW_MS = 30_000;

const nap = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

function startedSince(op: LinkedOperation, since: number): boolean {
  const at = new Date(op.created_at ?? "").getTime();
  return Number.isFinite(at) && at >= since - SKEW_MS;
}

/** The table's background sync that is still running (a reload mid-wait picks the wait up again), or null. */
export async function runningSync(tableId: string, read: Read = fetchOperationsByLink): Promise<LinkedOperation | null> {
  const found = await read(SYNC_LINK_KIND, tableId);
  return (found.operations ?? []).find((op) => !op.is_terminal) ?? null;
}

/**
 * Follow the background sync this press started until it settles; answers the settled run, or
 * null when the follow was stopped (the bar left the page); throws SyncFollowTimedOut at the ceiling. A failed read is retried at the
 * next look: a blip never ends the wait.
 */
export async function followSyncRun(tableId: string, options: FollowOptions): Promise<LinkedOperation | null> {
  const { since, every = 4000, signal, read = fetchOperationsByLink, sleep = nap, ceilingMs = SYNC_FOLLOW_CEILING_MS, now = Date.now } = options;
  const began = now();
  while (!signal?.aborted) {
    try {
      const found = await read(SYNC_LINK_KIND, tableId);
      const mine = (found.operations ?? []).filter((op) => startedSince(op, since));
      const live = mine.find((op) => !op.is_terminal);
      const settled = mine.find((op) => op.is_terminal);
      if (!live && settled) return settled;
    } catch {
      // keep waiting: the next look asks again
    }
    if (now() - began >= ceilingMs) throw new SyncFollowTimedOut();
    await sleep(every);
  }
  return null;
}

/** The sentence a settled run that did not complete leaves the person with. */
export function syncRunFailure(op: LinkedOperation): string | null {
  if (op.status === "completed") return null;
  const said = op.error && typeof op.error === "object" ? (op.error as { message?: unknown; error?: unknown }) : null;
  const words = typeof said?.message === "string" ? said.message : typeof said?.error === "string" ? said.error : null;
  return words || (op.status === "cancelled" ? "The sync was stopped." : "The sync did not finish.");
}
