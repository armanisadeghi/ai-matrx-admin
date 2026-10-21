/**
 * "Make this an agent" survives a reload: the in-flight draft (approved answer, capture, the
 * inputs brief awaiting confirm) lives on the doer's own conversation row
 * (`chat.conversation.metadata.agent_studio_make`) — one place per fact, nothing kept by the
 * Studio itself. Cleared once the build starts (the build's own record holds it from then on).
 */

import { conversationMetadataKey } from "@ai-matrx/chat/agents/redux/execution-system/conversations/conversation-metadata-key";
import { MAKE_DRAFT_KEY, readMakeDraft, type StudioMakeDraft } from "./studio-state";

const makeDraftKey = conversationMetadataKey<unknown>(MAKE_DRAFT_KEY);

export async function loadMakeDraft<Brief>(conversationId: string): Promise<StudioMakeDraft<Brief> | null> {
  return readMakeDraft<Brief>({ [MAKE_DRAFT_KEY]: await makeDraftKey.read(conversationId) });
}

/** Writes (or with `null`, clears) the draft through the one conversation-metadata door; sibling keys survive. */
export async function saveMakeDraft<Brief>(conversationId: string, draft: StudioMakeDraft<Brief> | null): Promise<void> {
  await makeDraftKey.edit(conversationId, () => (draft ? { ...draft, saved_at: new Date().toISOString() } : null));
}
