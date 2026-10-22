"use client";

/**
 * Messages Layout Client
 *
 * Desktop: a persistent sidebar carrying the conversation list. Mobile: the
 * sidebar is hidden and each route is full-screen.
 *
 * The list is `@ai-matrx/messaging`'s, wrapped in this app's right-click menu
 * by `<ConversationListPane>`. Its data comes from the ONE messaging engine
 * mounted app-wide in `providers/MessagingHost.tsx` — there is no per-route
 * initializer and no Redux mirror of the conversation list any more.
 *
 * Each page injects its own shell header via `<PageHeader>` (see
 * `features/messaging/components/shell/`); the sidebar carries no title of its
 * own and gets `pt-[var(--shell-header-h)]` so its toolbar clears the glass
 * header.
 */

import React from "react";
import { ConversationListPane } from "@/features/messaging/components/ConversationListPane";
import { useMessagesSurfaceScope } from "@/features/messaging/lib/useMessagesSurfaceScope";
import {
  FrameSidebarContent,
  useFrameSidebarSlot,
} from "@/features/shell/frame-host/frameSidebarSlot";
import {
  MessagesConversationOpener,
  useOpenConversation,
} from "@/features/messaging/lib/openConversation";

export default function MessagesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  // One opener for the list beside the thread, the phone list and the thread
  // header: a row click shows "Opening…" until its route is on screen.
  return (
    <MessagesConversationOpener>
      <MessagesLayoutBody>{children}</MessagesLayoutBody>
    </MessagesConversationOpener>
  );
}

function MessagesLayoutBody({ children }: { children: React.ReactNode }) {
  const openConversation = useOpenConversation();
  const getScope = useMessagesSurfaceScope();
  const inFrame = useFrameSidebarSlot();
  const list = (
    <ConversationListPane
      className="min-h-0 flex-1"
      onSelect={openConversation}
      getApplicationScope={getScope}
    />
  );

  // The new app frame: the conversation list is the frame's ONE sidebar column.
  if (inFrame) {
    return (
      <div className="@container/messages flex h-full min-h-0 overflow-y-auto overflow-x-hidden bg-background">
        <FrameSidebarContent>
          <div className="flex min-h-0 flex-1 flex-col">{list}</div>
        </FrameSidebarContent>
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </div>
    );
  }

  return (
    // A size container: the list sits beside the thread when the MAIN COLUMN
    // has room (42rem), not the window — the canvas narrows the column on a
    // desktop. The thread's Back follows the same container (messages-native.css).
    <div className="@container/messages flex h-full min-h-0 overflow-y-auto overflow-x-hidden bg-background">
      {/* Persistent conversation list beside the thread */}
      <div className="hidden min-h-0 w-80 shrink-0 flex-col border-r border-border pt-[var(--shell-header-h)] @2xl/messages:flex">
        {list}
      </div>

      {/* Main Content Area - Route Outlet */}
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
