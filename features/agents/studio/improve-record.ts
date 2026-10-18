/**
 * The Improve loop survives a reload: the Debrief answer and the "Try as candidate" draft live on the run's
 * own conversation row (`chat.conversation.metadata.agent_studio_improve`) beside the other Studio records —
 * one place per fact, nothing kept only in page memory. The debrief's durable body is its fork conversation
 * (server side); the row keeps the link and the text it produced so the cards come back without a re-run.
 * The candidate is an UNSAVED draft: reload re-applies it to the Builder record, "Keep" is the only save.
 */

import { mergeJsonColumn } from "@ai-matrx/data/db";
import { createClient } from "@/utils/supabase/client";
import type { StudioCandidate } from "./battle";

export const IMPROVE_KEY = "agent_studio_improve";

export interface StoredDebrief {
  message_id: string;
  fork_conversation_id: string | null;
  model: string | null;
  text: string;
}

export interface ImproveRecord {
  debrief?: StoredDebrief | null;
  candidate?: StudioCandidate | null;
}

/** The stored value as a record; a half-written row never throws. */
export function readImproveRecord(metadata: unknown): ImproveRecord {
  const raw = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>)[IMPROVE_KEY] : null;
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const d = r.debrief as Partial<StoredDebrief> | null | undefined;
  const c = r.candidate as Partial<StudioCandidate> | null | undefined;
  return {
    debrief:
      d && typeof d.message_id === "string" && typeof d.text === "string"
        ? { message_id: d.message_id, fork_conversation_id: d.fork_conversation_id ?? null, model: d.model ?? null, text: d.text }
        : null,
    candidate:
      c && typeof c.proposalId === "string"
        ? { proposalId: c.proposalId, title: c.title ?? "", messages: Array.isArray(c.messages) ? c.messages : null, modelId: c.modelId ?? null }
        : null,
  };
}

export async function loadImproveRecord(conversationId: string): Promise<ImproveRecord> {
  const { data, error } = await createClient()
    .schema("chat")
    .from("conversation")
    .select("metadata")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw new Error(`The saved debrief did not load: ${error.message}`);
  return readImproveRecord(data?.metadata);
}

/** Merges one part (`debrief` or `candidate`; `null` clears it); sibling metadata keys survive. */
export async function saveImprovePart<K extends keyof ImproveRecord>(
  conversationId: string,
  part: K,
  value: ImproveRecord[K],
): Promise<void> {
  const supabase = createClient();
  const result = await mergeJsonColumn<{ id: string; version: number; metadata: unknown }>({
    fetchCurrent: () =>
      supabase.schema("chat").from("conversation").select("id,version,metadata").eq("id", conversationId).maybeSingle(),
    readColumn: (row) => row.metadata,
    merge: (current) => {
      const prev = readImproveRecord(current);
      return { ...current, [IMPROVE_KEY]: { ...prev, [part]: value } };
    },
    applyUpdate: ({ value: next, expectedVersion, nextVersion }) =>
      supabase
        .schema("chat")
        .from("conversation")
        .update({ metadata: next, version: nextVersion })
        .eq("id", conversationId)
        .eq("version", expectedVersion)
        .select("id,version,metadata")
        .maybeSingle(),
  });
  if (result.status !== "saved") throw new Error(`The ${part} did not save (${result.status})`);
}
