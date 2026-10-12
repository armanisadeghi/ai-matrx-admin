// features/block-state/hostEntity.ts
//
// WHICH RECORD HOLDS A BLOCK'S SAVED STATE — decided in ONE place.
//
// A chat answer's inline block is held by the ANSWER (`message` row, read back
// by the one batched `block_state_list_conversation`). The server also
// materializes a structured artifact (a questionnaire) into a canvas item and
// rewrites the persisted answer to point at it, so on a reload the same block
// arrives carrying a `canvas_item` id. If that id re-homed the block, every
// answer typed before the reload (saved on the message) would be orphaned: the
// questionnaire reloads empty and its "N answers" chip is gone. So the canvas
// item holds state only where there is no answer to belong to — the canvas
// pane itself, or a surface with no chat message.

import { isMaterializedArtifactId } from "@/features/canvas/artifact-types/artifactId";

export interface HostEntityInput {
  mode?: "inline" | "artifact" | "canvas" | null;
  artifactId?: string | null;
  messageId?: string | null;
  conversationId?: string | null;
}

/** The canvas item id that should hold the block's state, or null when the chat answer does. */
export function canvasItemIdForHost({ mode, artifactId, messageId, conversationId }: HostEntityInput): string | null {
  if (!isMaterializedArtifactId(artifactId)) return null;
  const inChatAnswer = mode !== "canvas" && !!messageId && !!conversationId;
  return inChatAnswer ? null : artifactId!.trim();
}
