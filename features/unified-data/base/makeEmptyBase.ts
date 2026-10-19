// features/unified-data/base/makeEmptyBase.ts — "Start empty": make a base honestly (AT-FIX-E3).
//
// A base is made in two writes (the table, which makes its own Home; then the base's name). Under load either write can
// be cancelled by the database ("canceling statement due to statement timeout") AFTER the work is already done, or before
// it. So a failure is never trusted: the base is READ back by what was asked for, and a create that completed is a success.
// Only when it really is not there is it a failure, and then with a sentence, never the database's words.

export interface MadeBase {
  homeId: string;
}

export interface MakeEmptyBaseDeps {
  /** Make (or find, by slug) the table; answers the table id + Home, or the store's refusal. */
  ensure: (tableName: string) => Promise<{ ok: true; tableId: string; homeId: string } | { ok: false; message: string }>;
  /** The Home + organization of a table that is already there, read back by its name; null when it is not there. */
  findTable: (tableName: string) => Promise<{ tableId: string; homeId: string; organizationId: string } | null>;
  /** Name the base (made the first time, changed after). */
  save: (organizationId: string, homeId: string, name: string) => Promise<void>;
}

export type MakeEmptyBaseResult = { ok: true; homeId: string } | { ok: false; sentence: string };

export const BASE_NOT_MADE_SENTENCE = "The base was not made. Nothing was lost; try again in a moment.";

const quiet = async <T,>(read: () => Promise<T>): Promise<T | null> => {
  try {
    return await read();
  } catch {
    return null;
  }
};

export async function makeEmptyBase(name: string, deps: MakeEmptyBaseDeps): Promise<MakeEmptyBaseResult> {
  const tableName = `${name.trim()} — Table 1`.slice(0, 80);
  let homeId: string;
  let organizationId = "";

  const made = await quiet(() => deps.ensure(tableName));
  if (made && made.ok) {
    homeId = made.homeId;
  } else {
    // The write may have finished before the database cancelled the answer: look for what was asked for.
    const found = await quiet(() => deps.findTable(tableName));
    if (!found) return { ok: false, sentence: BASE_NOT_MADE_SENTENCE };
    homeId = found.homeId;
    organizationId = found.organizationId;
  }

  if (!organizationId) {
    const found = await quiet(() => deps.findTable(tableName));
    organizationId = found?.organizationId ?? "";
  }

  // Naming is asked twice: a cancelled answer may mean it landed (the second ask updates the same row). If it still does
  // not answer, the base is opened anyway: its table and Home exist, and the base page lets the person name it.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const named = await quiet(async () => {
      await deps.save(organizationId, homeId, name);
      return true;
    });
    if (named) break;
  }
  return { ok: true, homeId };
}
