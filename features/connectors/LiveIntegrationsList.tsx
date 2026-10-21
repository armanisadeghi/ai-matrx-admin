"use client";

import { IntegrationsWorkspace } from "@/features/settings/pages/IntegrationsSettingsPage";

/**
 * The same directory used by Settings, framed by the chat's floating window. Opened from a chat it
 * carries the chat (each connector offers "In this chat") and what was searched there.
 */
export function LiveIntegrationsList({
  provider = null,
  search = "",
  conversationId = null,
}: {
  provider?: string | null;
  search?: string;
  conversationId?: string | null;
}) {
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      <IntegrationsWorkspace
        embedded
        initialProvider={provider}
        initialQuery={search}
        chatConversationId={conversationId}
      />
    </div>
  );
}
