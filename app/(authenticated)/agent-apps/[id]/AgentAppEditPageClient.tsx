"use client";

import { useEffect, useRef } from "react";
import { CodeWorkspaceRoute } from "@/features/code/host/CodeWorkspaceRoute";
import { ChatPanelSlot } from "@/features/code/chat/ChatPanelSlot";
import { useOpenSourceEntry } from "@/features/code/hooks/useOpenSourceEntry";
import { useOpenRenderPreview } from "@/features/code/hooks/useOpenRenderPreview";
import { agaAppsAdapter } from "@/features/code/library-sources/adapters/aga-apps";
// Side-effect: register `aga-app:` previewer with the render-preview registry.
import "@/features/agent-apps/code-preview/registerAgentAppRenderPreview";
import type { AgentApp } from "@/features/agent-apps/types";

interface AgentAppEditPageClientProps {
  app: AgentApp;
}

export function AgentAppEditPageClient({ app }: AgentAppEditPageClientProps) {
  const openSourceEntry = useOpenSourceEntry();
  const openRenderPreview = useOpenRenderPreview();
  const bootstrappedRef = useRef(false);
  const basePath = `/agent-apps/${app.id}`;

  // On first mount: open the agent-app's `component_code` as a Monaco
  // tab, pop the live-preview tab next to it, and inject `?agentId=`
  // so the chat panel auto-binds to the app's agent. Idempotent.
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void openSourceEntry({ sourceId: agaAppsAdapter.sourceId, rowId: app.id })
      .then(() => {
        openRenderPreview(agaAppsAdapter.makeTabId(app.id));
        if (app.agent_id) {
          const url = new URL(window.location.href);
          if (!url.searchParams.get("agentId")) {
            url.searchParams.set("agentId", app.agent_id);
            window.history.replaceState({}, "", url.toString());
          }
        }
      })
      .catch((err) => {
        console.error("[agent-apps] failed to open code+preview tabs", err);
      });
  }, [app.id, app.agent_id, openSourceEntry, openRenderPreview]);

  return <CodeWorkspaceRoute rightSlot={<ChatPanelSlot basePath={basePath} />} />;
}
