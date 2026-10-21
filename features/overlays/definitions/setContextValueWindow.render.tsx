"use client";

// The chat package's Set Context Value window (the same body Matrx 2 opens), reading and writing
// the web's own scope store (features/scopes/host/scopeContextSource).
import type { EditorMode } from "@ai-matrx/chat/ui/content-refine/RefinableContentEditor";
import SetContextValueWindow from "@ai-matrx/chat/window-panels/windows/scopes/SetContextValueWindow";
import { ScopeContextSourceProvider } from "@ai-matrx/chat/window-panels/windows/scopes/scope-context-source";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { useWebScopeContextSource } from "@/features/scopes/host/scopeContextSource";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {
  const source = useWebScopeContextSource();
  const data = overlayData as Record<string, unknown> | null | undefined;
  return (
    <ScopeContextSourceProvider source={source}>
      <SetContextValueWindow
        isOpen
        onClose={() => close()}
        {...(instanceId ? { instanceId } : {})}
        initialContent={typeof data?.initialContent === "string" ? data.initialContent : undefined}
        {...(data?.initialEditorMode ? { initialEditorMode: data.initialEditorMode as EditorMode } : {})}
      />
    </ScopeContextSourceProvider>
  );
}
