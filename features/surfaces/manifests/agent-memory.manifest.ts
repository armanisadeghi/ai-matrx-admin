/**
 * Surface manifest — Agent memories (`/memory/agent-memory`, `matrx-user/agent-memory`).
 *
 * The person's long-term agent memories (`chat.agent_memory`, one fact per row): the list, the
 * one open in the editor, and the editor's draft. Emitter + handlers: `AgentMemoryPage`, through
 * `AgentMemoryPanel`'s `wrap` (the panel's ONE `useAgentMemories` state; @ai-matrx/chat W2-B).
 *
 * Writes stage the editor's draft through the editor's own setters; NOTHING is saved until the
 * person presses Save. Deleting stays the person's own button.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const AGENT_MEMORY_SURFACE_NAME = "matrx-user/agent-memory" as const;

const groups: SurfaceValueGroup[] = [
  { key: "agent_memories", label: "Memories", sortOrder: 100, description: "Every memory the person's agents keep." },
  { key: "memory_editor", label: "Open memory", sortOrder: 200, description: "The memory open in the editor." },
];

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  group: string,
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group,
  sortOrder,
  ...extra,
});

const values: SurfaceValue[] = [
  v("load_status", "Load status", "string", "agent_memories", 100, '"loading", "loaded" or "failed" (the list could not be read).', {
    alwaysAvailable: true,
    typicalCharCount: 8,
  }),
  v("memory_count", "Memories", "number", "agent_memories", 110, "How many memories the person has."),
  v("sort_mode", "Sorted by", "string", "agent_memories", 115, '"importance", "updated", "created" or "alphabetical".', { typicalCharCount: 12 }),
  v("memories", "Memories", "array", "agent_memories", 120, "Every memory in list order: { memory_id, title, scope, importance (0-1), updated_at }. The open memory's text is draft_content.", {
    typicalCharCount: 800,
    inlineUpTo: 4000,
  }),
  v("editor_view", "Editor", "string", "memory_editor", 200, '"all" (the overview, nothing open), "new" (a new memory being written) or "one" (an existing memory open).', {
    alwaysAvailable: true,
    typicalCharCount: 3,
  }),
  v("open_memory_id", "Open memory", "string", "memory_editor", 205, "The memory_id open in the editor. Empty unless editor_view is \"one\".", { typicalCharCount: 36 }),
  v("draft_title", "Title", "string", "memory_editor", 210, "The editor's title, including unsaved edits."),
  v("draft_content", "Memory text", "string", "memory_editor", 220, "The editor's text, including unsaved edits.", { typicalCharCount: 400, inlineUpTo: 4000 }),
  v("draft_importance", "Importance", "number", "memory_editor", 230, "The editor's importance, 0 to 1."),
  v("draft_scope", "Scope", "string", "memory_editor", 240, '"user" (only this person) or "organization".', { typicalCharCount: 12 }),
  v("unsaved_changes", "Unsaved changes", "boolean", "memory_editor", 250, "True when the editor differs from the saved memory."),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "draft_content",
    label: "Memory text",
    description:
      'Replaces the editor\'s text. NOTHING is saved: the person presses Save. Value: a plain string. Refused on the overview (editor_view "all"): ask the person to open a memory or start a new one.',
    valueType: "string",
    patchable: true,
    approvalComparison: "text-replacement",
    updatesValue: "draft_content",
    mode: "draft",
    applyPolicy: "ask",
    group: "memory_editor",
    sortOrder: 300,
  },
  {
    name: "draft_title",
    label: "Title",
    description:
      'Replaces the editor\'s title. NOTHING is saved: the person presses Save. Value: a plain string. Refused on the overview (editor_view "all").',
    valueType: "string",
    updatesValue: "draft_title",
    mode: "draft",
    applyPolicy: "ask",
    group: "memory_editor",
    sortOrder: 310,
  },
];

export const agentMemoryManifest: SurfaceManifest = {
  surfaceName: AGENT_MEMORY_SURFACE_NAME,
  situation:
    "They are managing their agents' long-term memories: {memory_count|no} memories, editor: {editor_view|all}, open: {draft_title|none}.",
  inheritsFrom: "matrx-default/knowledge",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Agent memories",
  description: "The person's long-term agent memories: one fact per memory, user or organization scope.",
  urlPattern: "/memory/agent-memory",
  groups,
  values,
  writeTargets,
};

export function createAgentMemoryScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
