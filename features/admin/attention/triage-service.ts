/**
 * The dock's triage doors (super-admin, every page): `platform.attention_card` (read, which also
 * settles the signal metric) and `platform.attention_record` (what the card showed, what the owner
 * did). Both are SECURITY DEFINER and gate on `is_super_admin_person()`.
 */

import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { pgErrorToError } from "@ai-matrx/data";
import { parseTriage, type AttentionTriage } from "./triage";

// The two functions return jsonb / integer and are not in the generated Database types yet;
// the shapes are parsed (garbage-safe) by parseTriage.
interface UntypedRpc {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: PostgrestError | null }>;
}

function platformRpc(): UntypedRpc {
  return createClient().schema("platform") as unknown as UntypedRpc;
}

export async function fetchAttentionTriage(): Promise<AttentionTriage> {
  const { data, error } = await platformRpc().rpc("attention_card");
  if (error) throw pgErrorToError(error);
  return parseTriage(data);
}

export type AttentionEvent = "shown" | "acted" | "muted";

export interface AttentionEventItem {
  item_key: string;
  source: string;
  kind: string;
}

/** Best-effort: the metric must never break the card. A failure is logged, not thrown. */
export async function recordAttention(
  event: AttentionEvent,
  items: readonly AttentionEventItem[],
  detail: string | null = null,
): Promise<void> {
  if (items.length === 0) return;
  const { error } = await platformRpc().rpc("attention_record", {
    p_event: event,
    p_items: items,
    p_detail: detail,
  });
  if (error) console.warn("[attention] could not record", event, error.message);
}
