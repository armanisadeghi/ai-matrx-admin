"use client";

import "../messages-native.css";

/**
 * The app's conversation list: `@ai-matrx/messaging`'s list, inside this app's
 * right-click menu.
 *
 * The pane owns ONE v3 menu for the whole list and resolves which row was
 * right-clicked from `data-conversation-id` — the attribute the provider's
 * `wrapConversationRow` chrome puts on each row. One menu, every row, no
 * per-row menu instances.
 *
 * Nothing here re-renders a conversation. The rows, the search, the unread
 * badges, the ordering and the "load older" door are the package's.
 */

import { useEffect, useRef, useState } from "react";
import { useMessagePins } from "../lib/useMessagePins";
import { ConversationList, useConversations } from "@ai-matrx/messaging/react";
import type { ConversationSummary } from "@ai-matrx/messaging/react";
import { asConversationId } from "@ai-matrx/messaging";
import { cn } from "@/lib/utils";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { CONTEXT_MENU_ENTITY_KEY } from "@ai-matrx/context-menu/engine";
import { Button } from "@/components/ui/button";
import { ListChecks } from "lucide-react";
import { RowSelectionBar } from "@/lib/entity-list/RowSelectionBar";
import {
  setSelecting,
  toggleConversation,
  useConversationRowSelection,
  useConversationSelectionState,
} from "../lib/conversationSelection";
import { conversationBulkActions } from "../lib/conversationBulkActions";
import { NewConversationDialog } from "./NewConversationDialog";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import {
  MESSAGES_SURFACE_NAME,
  conversationCopyLines,
  conversationEntityRef,
  buildConversationMenuSection,
} from "@/features/messaging/lib/messaging-menu-actions";

export interface ConversationListPaneProps {
  onSelect?: (conversationId: string) => void;
  /**
   * Take over the "+" button. A host that owns the dialog itself (the floating
   * window drives the SAME dialog from its empty-state menu) passes this;
   * everyone else gets the dialog this pane owns.
   */
  onNewConversation?: () => void;
  getApplicationScope?: () => SurfaceScopePayload;
  className?: string;
}

export function ConversationListPane({
  onSelect,
  onNewConversation,
  getApplicationScope,
  className,
}: ConversationListPaneProps) {
  const { conversations, markRead, markUnread, setMuted, setArchived } =
    useConversations();
  const { pins, toggle } = useMessagePins();
  const [menuConversation, setMenuConversation] =
    useState<ConversationSummary | null>(null);
  const menuRef = useRef<ConversationSummary | null>(null);
  const [ownDialogOpen, setOwnDialogOpen] = useState(false);
  // Select mode: a click on a row ticks it, and the bar carries the row menu's verbs (conversationBulkActions.ts).
  const { selecting } = useConversationSelectionState();
  // Leaving the pane ends Select mode, so the next visit never opens with stale ticks.
  useEffect(() => () => setSelecting(false), []);
  const ticked = useConversationRowSelection(conversations, (item) => item.conversation.id);
  const bulkActions = conversationBulkActions({
    markRead: (id) => markRead(asConversationId(id)),
    markUnread: (id) => markUnread(asConversationId(id)),
    setMuted: (id, muted) => setMuted(asConversationId(id), muted),
    setArchived: (id, archived) => setArchived(asConversationId(id), archived),
    pins,
  });

  return (
    <NonEditableContextMenu
      sourceFeature="messages"
      surfaceName={MESSAGES_SURFACE_NAME}
      {...(getApplicationScope ? { getApplicationScope } : {})}
      // `{type:"raw"}`, deliberately NOT `chat-message`: that ContentSource
      // resolves against `chat.message` (the AI chat), so a DM pointed at it
      // would send Convert/Edit at the wrong table.
      contentSource={{ type: "raw" }}
      contextData={{ content: "" }}
      resolveContextOnOpen={(target) => {
        const id = target
          ?.closest("[data-conversation-id]")
          ?.getAttribute("data-conversation-id");
        const found =
          conversations.find((item) => item.conversation.id === id) ?? null;
        menuRef.current = found;
        setMenuConversation(found);
        if (!found) return { [CONTEXT_MENU_ENTITY_KEY]: null };
        return {
          [CONTEXT_MENU_ENTITY_KEY]: conversationEntityRef(found),
          content: conversationCopyLines(found),
        };
      }}
      extraSections={[
        buildConversationMenuSection({
          conversation: menuConversation,
          isPinned: menuConversation
            ? pins.includes(menuConversation.conversation.id)
            : false,
          onTogglePin: toggle,
          rowActions: { markRead, markUnread, setMuted, setArchived },
          ...(onSelect ? { onOpen: onSelect } : {}),
        }),
      ]}
    >
      {/* `asChild` needs a real DOM element to hang the handler on. */}
      <div className={cn("messages-native flex min-h-0 flex-col", className)}>
        <div className="flex min-h-9 items-center justify-end px-2">
          {selecting ? (
            <div className="min-w-0 flex-1">
              <RowSelectionBar
                selection={ticked}
                idOf={(item) => item.conversation.id}
                actions={bulkActions}
                noun="conversation"
                plural="conversations"
                compact
                onRefresh={() => {}}
              />
            </div>
          ) : null}
          <Button
            variant="quiet"
            icon={<ListChecks />}
            aria-pressed={selecting}
            onClick={() => setSelecting(!selecting)}
          >
            {selecting ? "Done" : "Select"}
          </Button>
        </div>
        <ConversationList
          pinnedConversationIds={pins}
          onTogglePin={toggle}
          className="min-h-0 flex-1"
          {...(selecting || onSelect
            ? { onSelect: (id: string) => (selecting ? toggleConversation(id) : onSelect?.(id)) }
            : {})}
          onNewConversation={
            onNewConversation ?? (() => setOwnDialogOpen(true))
          }
        />
        {onNewConversation === undefined ? (
          <NewConversationDialog
            open={ownDialogOpen}
            onOpenChange={setOwnDialogOpen}
            onCreated={(conversationId) => {
              setOwnDialogOpen(false);
              onSelect?.(conversationId);
            }}
          />
        ) : null}
      </div>
    </NonEditableContextMenu>
  );
}

export default ConversationListPane;
