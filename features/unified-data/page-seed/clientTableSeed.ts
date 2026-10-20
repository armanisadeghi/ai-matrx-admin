"use client";

// features/unified-data/page-seed/clientTableSeed.ts — lane SSR-ROWS-3
//
// THE BROWSER'S OWN FIRST READS, ASKED THE MOMENT THE PAGE HYDRATES — never after the server's
// boundary. The same doors with the same arguments the server asks (`where_id_opens`, then
// `askTablePageSeed`: the table's bundle and the grid's predicted first page), recorded as the SAME
// seed shape, so the page is drawn from whichever lands first. A server seed that lands in time is
// drawn from the server's HTML; a slow or missing one costs nothing, because these reads started at
// hydration instead of at the server's cap.

import { askTablePageSeed } from "@ai-matrx/records-ui/first-page";
import { seedIndex, seedKey } from "@ai-matrx/records/core";
import type { RecordsDataSource } from "@ai-matrx/records";
import { isTimedOutError } from "@ai-matrx/design-system";

import { ensureObjectOrganization, readObjectOrganizationAnswer } from "@/features/unified-data/objectOrganization";
import type { TablePageSeed } from "./tablePageSeed.server";

/**
 * EACH DOOR FROM WHICHEVER ANSWERS FIRST: the browser's own call, or the same door + arguments in
 * the server's streamed seed (its `where_id_opens` and bundle land even when the person's knob is
 * off). A door the server already answered is never asked again; one still in flight on both sides
 * takes the first answer. So the browser's chain is never slower than the server's, and never
 * waits for it.
 */
function racingDataSource(source: RecordsDataSource, ...servers: Array<Promise<TablePageSeed | null>>): RecordsDataSource {
  // The server's opening (where + bundle, the moment they land) and its full seed (rows too, when
  // they made the cap), each indexed by door + canonical arguments as it lands.
  const indexes = servers.map((p) => p.then((s) => (s?.records ? seedIndex(s.records) : null), () => null));
  const landed: Array<Map<string, unknown>> = [];
  for (const ix of indexes) void ix.then((m) => m && landed.push(m));
  const never = new Promise<never>(() => {});
  const rpc: RecordsDataSource["rpc"] = (fn, args, options) => {
    const key = seedKey(fn, args);
    for (const m of landed) if (m.has(key)) return Promise.resolve({ data: m.get(key), error: null });
    const network = Promise.resolve(source.rpc(fn, args, options));
    const fromServer = indexes.map((ix) => ix.then((m) => (m?.has(key) ? { data: m.get(key), error: null } : never)));
    return Promise.race([network, ...fromServer]) as ReturnType<RecordsDataSource["rpc"]>;
  };
  return new Proxy(source, { get: (target, prop, receiver) => (prop === "rpc" ? rpc : Reflect.get(target, prop, receiver)) });
}

/**
 * Ask the table page's first reads from the browser, as the signed-in person. Never rejects: null
 * when the table does not open here or a read failed — the page then asks for itself, as always.
 * `rows`: the address opens the plain table, so the grid's first page is asked too.
 */
export async function askClientTableSeed(
  dataSource: RecordsDataSource,
  tableId: string,
  options: {
    userId?: string | null;
    rows?: boolean;
    recordId?: string | null;
    server?: Promise<TablePageSeed | null>;
    opening?: Promise<TablePageSeed | null>;
  } = {},
): Promise<TablePageSeed | null> {
  try {
    // `server` is React's streamed thenable: adopt it so it chains as a Promise. Never rejects.
    const server = Promise.resolve(options.server ?? null).then(
      (s) => (s && s.tableId === tableId ? s : null),
      () => null,
    );
    // Where the table lives: the kept answer for this table (`useObjectOrganization` waits on the
    // same one, so the page never asks it again), or the server's, whichever lands first.
    const opening = Promise.resolve(options.opening ?? null).then(
      (s) => (s && s.tableId === tableId ? s : null),
      () => null,
    );
    const racing = racingDataSource(dataSource, opening, server);
    const own = ensureObjectOrganization(dataSource, tableId);
    const fromServer = Promise.race([opening, server]).then((s) => (s && s.organizationId ? readObjectOrganizationAnswer(s.where, tableId) : own));
    const where = await Promise.race([own, fromServer]);
    if (!where || where.state !== "found") return null;
    const records = await askTablePageSeed({
      dataSource: racing,
      organizationId: where.organizationId,
      tableId,
      actor: options.userId ? { actor: "user", user_id: options.userId } : { actor: "user" },
      rows: options.rows !== false,
      recordId: options.recordId ?? null,
    });
    const bundle = records.answers.find((a) => a.door === "table_page_bundle");
    const recordBundle = options.recordId ? records.answers.find((a) => a.door === "record_page_bundle") : undefined;
    return {
      tableId,
      where: {
        data: {
          kind: where.kind,
          organization_id: where.organizationId,
          path: where.path,
          live: where.live,
          resolved_id: where.resolvedId,
        },
        error: null,
      },
      organizationId: where.organizationId,
      bundle: bundle ? { data: bundle.data, error: null } : null,
      recordId: options.recordId ?? null,
      recordBundle: recordBundle ? { data: recordBundle.data, error: null } : null,
      records,
    };
  } catch (thrown: unknown) {
    console.warn(`[page-seed] the browser could not ask table ${tableId}'s first reads; the page asks for itself.`, thrown);
    return null;
  }
}

/**
 * THE DOORS WHOSE TIMEOUT THE PERSON MUST BE TOLD ABOUT (lane AT-FIX-G4). When the table's bundle (or
 * the record's, or the table facts) is cancelled at the store's statement timeout, the page used to sit
 * on its skeleton through every internal retry and then draw — or not — with nothing said. A timeout is
 * a refusal the person can act on, so it is found here, retried once, and then said.
 */
const WATCHED_DOORS: readonly string[] = ["table_page_bundle", "record_page_bundle", "table_facts"];

/** The one automatic retry waits this long first (the store usually answers a second look at once: its plan is warm). */
export const TIMEOUT_RETRY_PAUSE_MS = 1500;

/** The doors asked through `source` whose LAST answer was the store's statement timeout (a retry that answered clears it). */
function watchingTimeouts(source: RecordsDataSource): { source: RecordsDataSource; timedOut: () => string[] } {
  const last = new Map<string, boolean>();
  const rpc: RecordsDataSource["rpc"] = (fn, args, options) => {
    const asked = Promise.resolve(source.rpc(fn, args, options));
    if (WATCHED_DOORS.includes(fn)) {
      void asked.then(
        (answered) => void last.set(fn, Boolean(answered?.error) && isTimedOutError(answered.error)),
        () => void last.set(fn, false),
      );
    }
    return asked as ReturnType<RecordsDataSource["rpc"]>;
  };
  return {
    source: new Proxy(source, { get: (target, prop, receiver) => (prop === "rpc" ? rpc : Reflect.get(target, prop, receiver)) }),
    timedOut: () => [...last].filter(([, timedOut]) => timedOut).map(([fn]) => fn),
  };
}

export interface HonestTableSeed {
  seed: TablePageSeed | null;
  /** The watched doors that STILL answered a statement timeout after the one automatic retry. Empty = nothing to say. */
  timedOut: string[];
}

/**
 * `askClientTableSeed`, honest about a store timeout: one automatic retry, then the doors that still
 * timed out are returned so the page can say so (the shared timeout sentence + Try again) instead of
 * drawing a skeleton through the store's own retries. Never rejects.
 */
export async function askClientTableSeedHonestly(
  dataSource: RecordsDataSource,
  tableId: string,
  options: Parameters<typeof askClientTableSeed>[2] = {},
): Promise<HonestTableSeed> {
  let attempt = 0;
  for (;;) {
    const watched = watchingTimeouts(dataSource);
    const seed = await askClientTableSeed(watched.source, tableId, options);
    const timedOut = watched.timedOut();
    if (timedOut.length === 0 || attempt >= 1) return { seed, timedOut };
    attempt += 1;
    console.warn(`[page-seed] ${timedOut.join(", ")} timed out for table ${tableId}; asking once more.`);
    await new Promise((resolve) => setTimeout(resolve, TIMEOUT_RETRY_PAUSE_MS));
  }
}
