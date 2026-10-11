/**
 * "Make this an agent" survives a reload: the in-flight draft (approved answer, capture, the
 * inputs brief awaiting confirm) lives on the doer's own conversation row
 * (`chat.conversation.metadata.agent_studio_make`) — one place per fact, nothing kept by the
 * Studio itself. Cleared once the build starts (the build's own record holds it from then on).
 */

import { mergeJsonColumn } from "@ai-matrx/data/db";
import { createClient } from "@/utils/supabase/client";
import { MAKE_DRAFT_KEY, readMakeDraft, type StudioMakeDraft } from "./studio-state";

export async function loadMakeDraft<Brief>(conversationId: string): Promise<StudioMakeDraft<Brief> | null> {
  const { data, error } = await createClient()
    .schema("chat")
    .from("conversation")
    .select("metadata")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw new Error(`The saved draft did not load: ${error.message}`);
  return readMakeDraft<Brief>(data?.metadata);
}

/** Writes (or with `null`, clears) the draft — a guarded merge, so sibling metadata keys survive. */
export async function saveMakeDraft<Brief>(conversationId: string, draft: StudioMakeDraft<Brief> | null): Promise<void> {
  const supabase = createClient();
  const result = await mergeJsonColumn<{ id: string; version: number; metadata: unknown }>({
    fetchCurrent: () =>
      supabase.schema("chat").from("conversation").select("id,version,metadata").eq("id", conversationId).maybeSingle(),
    readColumn: (row) => row.metadata,
    merge: (current) => {
      const next = { ...current };
      if (draft) next[MAKE_DRAFT_KEY] = { ...draft, saved_at: new Date().toISOString() };
      else delete next[MAKE_DRAFT_KEY];
      return next;
    },
    applyUpdate: ({ value, expectedVersion, nextVersion }) =>
      supabase
        .schema("chat")
        .from("conversation")
        .update({ metadata: value, version: nextVersion })
        .eq("id", conversationId)
        .eq("version", expectedVersion)
        .select("id,version,metadata")
        .maybeSingle(),
  });
  if (result.status !== "saved") throw new Error(`The draft did not save (${result.status})`);
}
