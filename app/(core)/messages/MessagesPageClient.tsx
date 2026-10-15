"use client";

/**
 * Authenticated-only client island for `/messages`. The parent layout decides
 * whether to render this or the marketing `<MessagesLanding />` from the SSR
 * auth state — a guest never loads any of this.
 *
 * On a phone this IS the list. On desktop the list lives in the layout's
 * sidebar and this is the "pick a conversation" pane.
 */

import { useEffect } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { useOptionalCanvas } from "@ai-matrx/canvas/react";
import { closeMessagesTab } from "@/features/messaging/canvas/messagesKind";
import { ConversationListPane } from "@/features/messaging/components/ConversationListPane";
import { MessagesListHeader } from "@/features/messaging/components/shell/MessagesListHeader";
import { useMessagesSurfaceScope } from "@/features/messaging/lib/useMessagesSurfaceScope";
import {
  useOpenConversation,
  useOpeningConversationId,
} from "@/features/messaging/lib/openConversation";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";

export default function MessagesPageClient() {
  const canvas = useOptionalCanvas();
  const openConversation = useOpenConversation();
  const openingId = useOpeningConversationId();
  const getScope = useMessagesSurfaceScope();

  // The Messages canvas tab and the full page are the same conversations;
  // leaving the tab open beside the page would be two views of one thread.
  useEffect(() => {
    closeMessagesTab(canvas);
  }, [canvas]);

  return (
    <SurfaceRuntimeProvider
      surfaceName="matrx-user/messages"
      getScope={getScope}
      isEditable={false}
    >
      <MessagesListHeader />

      {/* Narrow column: full-screen conversation list (the layout's list is
          hidden below its 42rem container width — MessagesLayoutClient) */}
      <div className="flex h-full flex-col pt-[var(--shell-header-h)] @2xl/messages:hidden">
        <ConversationListPane
          className="flex-1"
          onSelect={openConversation}
          getApplicationScope={getScope}
        />
      </div>

      {/* Wide column: the layout's list is beside this, so this is the default content */}
      <div className="hidden h-full flex-1 flex-col items-center justify-center p-8 text-center @2xl/messages:flex">
        {openingId ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
            <h2 className="text-lg font-medium text-foreground">
              Opening conversation…
            </h2>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground">
              Pick or start a conversation
            </h2>
          </>
        )}
      </div>
    </SurfaceRuntimeProvider>
  );
}
