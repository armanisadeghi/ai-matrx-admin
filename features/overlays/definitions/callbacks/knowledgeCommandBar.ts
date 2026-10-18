/**
 * ⌘K knowledge command bar overlay callbacks.
 *
 * A resource picker that hands its search step to the bar passes an attach
 * target and its own commands (Upload, URL entry, Voice, Tools) — functions,
 * which cannot travel through Redux. Same contract as `referencePicker`: the
 * opener registers a callback GROUP, only its id rides `openOverlay` data, the
 * overlay resolves it, and the group is disposed when the bar closes.
 */

// The light path on `./open`: registering and reading a payload never loads the registry.
import { peekHandle, registerHandleEntry, unregisterHandleEntry } from "@ai-matrx/summon/open";
import type { KnowledgeAttachTarget } from "@/features/knowledge/command-bar/attachTarget";
import type { KnowledgeCommand } from "@/features/knowledge/command-bar/commands";

export interface KnowledgeCommandBarCallbackGroup {
  attach?: KnowledgeAttachTarget;
  /** Host-supplied commands, listed first in the Commands section. */
  commands?: KnowledgeCommand[];
  onClosed?: () => void;
}

export function createKnowledgeCommandBarCallbackGroup(
  group: KnowledgeCommandBarCallbackGroup,
): { callbackGroupId: string; dispose: () => void } {
  // MATRX-EXCEPTION: stored as a non-callable payload, retrieved via `get`,
  // never `trigger`ed — the same convention as `createReferencePickerCallbackGroup`.
  const callbackGroupId = registerHandleEntry(group);
  return {
    callbackGroupId,
    dispose: () => unregisterHandleEntry(callbackGroupId),
  };
}

export function getKnowledgeCommandBarCallbackGroup(
  callbackGroupId: string | null | undefined,
): KnowledgeCommandBarCallbackGroup | null {
  if (!callbackGroupId) return null;
  return (
    peekHandle<KnowledgeCommandBarCallbackGroup>(callbackGroupId) ?? null
  );
}

export function disposeKnowledgeCommandBarCallbackGroup(
  callbackGroupId: string | null | undefined,
): void {
  if (callbackGroupId) unregisterHandleEntry(callbackGroupId);
}
