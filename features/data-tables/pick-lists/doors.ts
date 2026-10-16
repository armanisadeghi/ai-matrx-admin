/**
 * THE PICK-LIST DOORS, for any Supabase client (browser, server, a passed-in one): read a list with its
 * choices, read it for a selection control (labels only), rewrite it. They go through @ai-matrx/records
 * (`custom.pick_list_*`); no screen calls a public RPC for a pick list. The doors decide access on the
 * list's own id and organization, so the client here carries no organization of its own.
 */
import { lightPickListDoors } from "@ai-matrx/records/door-call";
import type { PickListDocument } from "@ai-matrx/records";
import type { SupabaseClient } from "@supabase/supabase-js";

// The light door client (`@ai-matrx/records/door-call`): the same door call as the records client,
// without the ~600 KB client — this module is reached from the shell.
// The pick_list doors take the list's id and read its organization from the list itself.
function doorsClient(client: SupabaseClient) {
  return lightPickListDoors(client);
}

/** The list with its choices grouped; null when there is none. Throws the door's refusal. */
export async function readPickList(client: SupabaseClient, listId: string): Promise<PickListDocument | null> {
  const read = await doorsClient(client).pickListGet({ list_id: listId });
  if (!read.ok) throw new Error(read.error.message);
  return read.data;
}

/** The list for a selection control: labels, help text, groups — never the secret description. */
export async function readPickListForSelection(client: SupabaseClient, listId: string): Promise<PickListDocument | null> {
  const read = await doorsClient(client).pickListForSelection({ list_id: listId });
  if (!read.ok) throw new Error(read.error.message);
  return read.data;
}

export async function rewritePickList(
  client: SupabaseClient,
  input: { listId: string; name?: string | null; description?: string | null; items?: readonly Record<string, unknown>[] | null },
): Promise<PickListDocument | null> {
  const wrote = await doorsClient(client).pickListUpdate({
    list_id: input.listId,
    list_name: input.name,
    description: input.description,
    items: input.items as never,
  });
  if (!wrote.ok) throw new Error(wrote.error.message);
  return wrote.data;
}
