"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@/lib/redux/hooks";
import { fetchCatalog } from "@ai-matrx/chat/agents/redux/mcp/mcp.slice";
import { googleConnectionKeys } from "@/features/marketing/google/hooks";
import { LiveIntegrationsList } from "@/features/connectors/LiveIntegrationsList";
import { WindowPanel } from "@ai-matrx/summon/window";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";

interface LiveIntegrationsWindowProps {
  isOpen: boolean;
  onClose: () => void;
  /** Land on this provider's detail. */
  provider?: string | null;
}

export default function LiveIntegrationsWindow({
  isOpen,
  onClose,
  provider,
}: LiveIntegrationsWindowProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  // What a person connects here must reach the chat they came from (Arman, 2026-10-20). The
  // chat's composer reads the same two sources this window changes — the MCP catalog and the
  // Google inventory — so a connection lands there on its own; this re-reads both when the
  // person returns to the tab (a provider's sign-in finished in another tab) and as the window
  // closes, so nothing waits on a stale answer.
  useEffect(() => {
    if (!isOpen) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void dispatch(fetchCatalog());
      void queryClient.invalidateQueries({ queryKey: googleConnectionKeys.inventory });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isOpen, dispatch, queryClient]);
  if (!isOpen) return null;

  return (
    <NonEditableContextMenu
      sourceFeature="system"
      contentSource={{ type: "raw" }}
      contextData={{ content: "Integrations" }}
    >
      <WindowPanel
        id="live-integrations-window"
        overlayId="liveIntegrationsWindow"
        title="Integrations"
        width={720}
        height={640}
        minWidth={360}
        minHeight={360}
        position="center"
        onClose={() => {
          void dispatch(fetchCatalog());
          void queryClient.invalidateQueries({ queryKey: googleConnectionKeys.inventory });
          onClose();
        }}
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      >
        <LiveIntegrationsList provider={provider ?? null} />
      </WindowPanel>
    </NonEditableContextMenu>
  );
}
