"use client";

// /memory/agent-memory — the Agent Memory manager (chat.agent_memory) as a page.
// The body is @ai-matrx/chat's AgentMemoryPanel — the same list, editor and footer
// the floating Agent Memory window draws; the header action opens that window.
// The page is `matrx-user/agent-memory`: `wrap` hands it the panel's one state.

import type { ReactNode } from "react";
import { AppWindow } from "lucide-react";
import {
  ALL_MEMORIES_ID,
  AgentMemoryPanel,
  NEW_MEMORY_ID,
  displayTitleForMemory,
  type AgentMemoriesState,
} from "@ai-matrx/chat/agents/components/memory/AgentMemoryPanel";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import {
  AGENT_MEMORY_SURFACE_NAME,
  createAgentMemoryScope,
} from "@/features/surfaces/manifests/agent-memory.manifest";
import { useOpenAgentMemoryWindow } from "@/features/overlays/definitions/agentMemoryWindow.overlay";
import { MemoryPageFrame } from "./MemoryPageFrame";

function editorView(state: AgentMemoriesState): "all" | "new" | "one" {
  if (state.selectedId === ALL_MEMORIES_ID) return "all";
  return state.selectedId === NEW_MEMORY_ID ? "new" : "one";
}

function AgentMemorySurface({ state, children }: { state: AgentMemoriesState; children: ReactNode }) {
  const getScope = () => {
    const view = editorView(state);
    return createAgentMemoryScope({
      load_status: state.loading ? "loading" : state.error && state.totalCount === 0 ? "failed" : "loaded",
      memory_count: state.totalCount,
      sort_mode: state.sortMode,
      memories: state.memories.map((m) => ({
        memory_id: m.id,
        title: displayTitleForMemory(m),
        scope: m.scope,
        importance: m.importance,
        updated_at: m.updated_at,
      })),
      editor_view: view,
      ...(view === "one" ? { open_memory_id: state.selectedId } : {}),
      ...(view === "all"
        ? {}
        : {
            draft_title: state.draft.title,
            draft_content: state.draft.content,
            draft_importance: state.draft.importance,
            draft_scope: state.draft.scope,
            unsaved_changes: state.isDirty,
          }),
    });
  };
  const needsEditor = (value: unknown) => {
    if (editorView(state) === "all") refuseSurfaceWrite("No memory is open. Ask the person to open one or start a new one.");
    if (typeof value !== "string") refuseSurfaceWrite("This takes a plain string.");
  };
  const getWriteHandlers = () => ({
    draft_content: {
      validate: needsEditor,
      apply: (value: unknown) => {
        state.setDraftContent(String(value));
        return { summary: "The memory text is replaced. Nothing is saved until the person presses Save." };
      },
    },
    draft_title: {
      validate: needsEditor,
      apply: (value: unknown) => {
        state.setDraftTitle(String(value));
        return { summary: "The title is replaced. Nothing is saved until the person presses Save." };
      },
    },
  });
  return (
    <SurfaceRuntimeProvider surfaceName={AGENT_MEMORY_SURFACE_NAME} getScope={getScope} getWriteHandlers={getWriteHandlers}>
      {children}
    </SurfaceRuntimeProvider>
  );
}

export function AgentMemoryPage() {
  const open = useOpenAgentMemoryWindow();
  return (
    <MemoryPageFrame
      name="Agent memories"
      fill
      actions={[{ label: "Open as window", icon: AppWindow, onPress: () => open() }]}
    >
      <AgentMemoryPanel wrap={(panel, state) => <AgentMemorySurface state={state}>{panel}</AgentMemorySurface>} />
    </MemoryPageFrame>
  );
}
