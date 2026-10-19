/**
 * Google refresh / pull into a record people may be co-editing (COLLAB-DESIGN §7.5, unit C7).
 *
 * A Doc or Sheet with an ordered co-editing room holds its current content in the room's log, not in its newest
 * snapshot row. Writing a whole snapshot there erases what people typed since the last save (and the open editors
 * never load it). So when a room exists, Google's version goes to aidream's `/collab/rooms/{id}/write`, which
 * folds the room to head, diffs to Google's content and appends the change as ops based on the rev it read: every
 * open editor merges it with what people are typing. Without a room the caller keeps its own snapshot write.
 * Reading for a push to Google goes through `/collab/rooms/{id}/current` the same way.
 */
import { collabRoomExists, type CollabRpcClient } from "@ai-matrx/data/realtime/collab";

import { requestRaw } from "@/lib/python-client";
import { supabase } from "@/utils/supabase/client";

export type LiveRoomKind = "udt_document" | "workbook";

export interface LiveRoomWrite {
  via: "append" | "replace" | "unchanged" | "snapshot";
  rev: number | null;
}

const rpc = () => supabase as unknown as CollabRpcClient;

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await requestRaw(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await res.json()) as T;
}

/** Google's whole content into the record's live room, as based ops. `null` = the record has no room. */
export async function writeIntoLiveRoom(kind: LiveRoomKind, recordId: string, snapshot: unknown): Promise<LiveRoomWrite | null> {
  if (!(await collabRoomExists(rpc(), recordId))) return null;
  const out = await post<{ via: LiveRoomWrite["via"]; rev?: number | null }>(`/collab/rooms/${encodeURIComponent(recordId)}/write`, {
    kind,
    snapshot,
    origin: "sync",
  });
  return { via: out.via, rev: out.rev ?? null };
}

/** The record as people see it now (its room folded to head). `null` = no room: read the newest snapshot. */
export async function readLiveRoom(kind: LiveRoomKind, recordId: string): Promise<unknown | null> {
  if (!(await collabRoomExists(rpc(), recordId))) return null;
  const out = await post<{ snapshot?: unknown; source: string }>(`/collab/rooms/${encodeURIComponent(recordId)}/current`, { kind });
  return out.snapshot ?? null;
}
