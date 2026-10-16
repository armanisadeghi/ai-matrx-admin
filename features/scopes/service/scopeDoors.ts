// features/scopes/service/scopeDoors.ts — THE one host binding of the scope doors (browser).
//
// Scopes are custom data (`@ai-matrx/records/scopes`): a scope type is a Table kept for context, a
// scope a Record of it, a context field a Field, a value its cell. Every scope read and write in this
// app goes through `scopeDoors()` — the records client's `scopes` doors bound to the browser supabase,
// through the LIGHT door client (`@ai-matrx/records/door-call`): the same door call the records client
// asks through, without the ~600 KB client (this module is reached from the shell on every route).
// Nothing else in the app calls a `custom.context_*` door (guard: `pnpm check:scopes-data-layer`).
// Server components use `serverScopeDoors()` from `./scopeDoors.server`.

import { lightScopeDoors, type ScopeDoors } from "@ai-matrx/records/door-call";
import { supabase } from "@/utils/supabase/client";
import { readFileText } from "@/features/unified-data/recordsFiles";

let doors: ScopeDoors | null = null;

/** The scope doors (memoized): tree, types, scopes, fields, values, every scope write, `tableProvision`. */
export function scopeDoors(): ScopeDoors {
  if (!doors) doors = lightScopeDoors(supabase);
  return doors;
}

/** Opens the whole text of a value kept as a file, as the person (hand to `scopeDoors().values`). */
export function readScopeFileText(fileId: string): Promise<string> {
  return readFileText({ fileId });
}
