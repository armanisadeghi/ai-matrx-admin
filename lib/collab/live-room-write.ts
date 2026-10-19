/**
 * Google refresh / pull into a record people may be co-editing (COLLAB-DESIGN §7.5, unit C7).
 *
 * A Doc or Sheet with an ordered co-editing room holds its current content in the room's log, not in its newest
 * snapshot row. Writing a whole snapshot there erases what people typed since the last save (and the open editors
 * never load it). So when a room exists, Google's version goes to aidream's `/collab/rooms/{id}/write`, which
 * folds the room to head, diffs to Google's content and appends the change as ops based on the rev it read: every
 * open editor merges it with what people are typing. Without a room the caller keeps its own snapshot write.
 * Reading goes through `readCurrentContent` (lib/collab/current-content.ts), the one shared reader.
 */
import { collabRoomExists, type CollabRpcClient } from "@ai-matrx/data/realtime/collab";

import { postCollab, type LiveRoomKind } from "@/lib/collab/current-content";
import { supabase } from "@/utils/supabase/client";


export interface LiveRoomWrite {
  via: "append" | "replace" | "unchanged" | "snapshot";
  rev: number | null;
}

const rpc = () => supabase as unknown as CollabRpcClient;

/** Google's whole content into the record's live room, as based ops. `null` = the record has no room. */
export async function writeIntoLiveRoom(kind: LiveRoomKind, recordId: string, snapshot: unknown): Promise<LiveRoomWrite | null> {
  if (!(await collabRoomExists(rpc(), recordId))) return null;
  const out = await postCollab<{ via: LiveRoomWrite["via"]; rev?: number | null }>(`/collab/rooms/${encodeURIComponent(recordId)}/write`, {
    kind,
    snapshot,
    origin: "sync",
  });
  return { via: out.via, rev: out.rev ?? null };
}
