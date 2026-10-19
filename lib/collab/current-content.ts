/**
 * THE one reader of a Doc's or Sheet's CURRENT content outside the editor (COLLAB-DESIGN §7.5, unit C7 readers).
 *
 * A record people are co-editing holds its current content in the room's log; its newest snapshot row is only the
 * last save. Every reader that is not the editor itself (export, download, canvas source, compare, save as template,
 * cited passages, Google push) goes through `readCurrentContent`:
 *   - no room                        -> the snapshot (`loadSnapshot`)
 *   - room, nothing past checkpoint  -> the snapshot the server returns
 *   - room ahead                     -> the folded content from aidream `POST /collab/rooms/{id}/current`
 *   - the server could not fold      -> the checkpoint, and `notice` says so in plain words
 * `announceIfStale` turns a notice into a toast; nothing falls back silently.
 * In the editor tab itself, read the live editor model instead (it is already current).
 */
import { collabRoomExists, type CollabRpcClient } from "@ai-matrx/data/realtime/collab";

import { requestRaw } from "@/lib/python-client";
import { toast } from "@/lib/toast";
import { supabase } from "@/utils/supabase/client";

export type LiveRoomKind = "udt_document" | "workbook";

export type CurrentContentSource =
  | "snapshot" // no room: the newest saved copy IS the current one
  | "checkpoint" // a room with nothing past its last save
  | "folded" // the room folded to head: includes edits not yet saved
  | "stale"; // the room could not be folded: the last save, missing newer edits

export interface CurrentContent {
  snapshot: unknown | null;
  source: CurrentContentSource;
  /** Plain words for the person when this copy may miss newer edits; null when it is current. */
  notice: string | null;
}

interface CurrentResponse {
  source: "no_room" | "checkpoint" | "folded" | "stale";
  head_rev?: number | null;
  checkpoint_rev?: number | null;
  snapshot?: unknown;
}

const rpc = () => supabase as unknown as CollabRpcClient;

export async function postCollab<T>(path: string, body: unknown): Promise<T> {
  const res = await requestRaw(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await res.json()) as T;
}

function staleNotice(head: number | null | undefined, checkpoint: number | null | undefined): string {
  const missing = Math.max(0, (head ?? 0) - (checkpoint ?? 0));
  return missing > 0
    ? `This is the last saved copy: ${missing} newer edit${missing === 1 ? "" : "s"} by people editing right now could not be included.`
    : "This is the last saved copy: edits people are making right now could not be included.";
}

const UNREACHABLE_NOTICE = "This is the last saved copy: we could not check for edits people are making right now.";

/**
 * `loadSnapshot` is the caller's own newest-snapshot door (it keeps each caller's error handling); it runs only when
 * the room cannot answer. It may throw: that is the caller's "no saved content" failure, unchanged.
 */
export async function readCurrentContent(
  kind: LiveRoomKind,
  recordId: string,
  loadSnapshot: () => Promise<unknown | null>,
): Promise<CurrentContent> {
  let roomExists: boolean;
  try {
    roomExists = await collabRoomExists(rpc(), recordId);
  } catch {
    return { snapshot: await loadSnapshot(), source: "stale", notice: UNREACHABLE_NOTICE };
  }
  if (!roomExists) return { snapshot: await loadSnapshot(), source: "snapshot", notice: null };

  let out: CurrentResponse;
  try {
    out = await postCollab<CurrentResponse>(`/collab/rooms/${encodeURIComponent(recordId)}/current`, { kind });
  } catch {
    return { snapshot: await loadSnapshot(), source: "stale", notice: UNREACHABLE_NOTICE };
  }
  if (out.source === "no_room" || out.snapshot == null) {
    return { snapshot: await loadSnapshot(), source: "snapshot", notice: null };
  }
  if (out.source === "stale") {
    return { snapshot: out.snapshot, source: "stale", notice: staleNotice(out.head_rev, out.checkpoint_rev) };
  }
  return { snapshot: out.snapshot, source: out.source, notice: null };
}

/** Say it when a reader had to fall back to an older copy. Returns the content so a caller can chain it. */
export function announceIfStale(content: CurrentContent): CurrentContent {
  if (content.notice) toast.info(content.notice);
  return content;
}
