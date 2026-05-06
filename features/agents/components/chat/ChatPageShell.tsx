"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History, MessagesSquare, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ConversationHistorySidebar } from "@/features/agents/components/conversation-history/ConversationHistorySidebar";
import type { ConversationListItem } from "@/features/agents/redux/conversation-list/conversation-list.types";

interface ChatPageShellProps {
  activeConversationId?: string;
  /** Content rendered in the page header (typically the agent picker). */
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
}

const CHAT_HISTORY_SCOPE = "chat-route";

interface ChatHistoryPanelProps {
  activeConversationId?: string;
  onOpenConversation: (conv: ConversationListItem) => void;
  onNewChat: () => void;
}

function ChatHistoryPanel({
  activeConversationId,
  onOpenConversation,
  onNewChat,
}: ChatHistoryPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Conversations
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs gap-1"
          onClick={onNewChat}
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <ConversationHistorySidebar
          scopeId={CHAT_HISTORY_SCOPE}
          agentIds={[]}
          activeConversationId={activeConversationId ?? null}
          onOpenConversation={onOpenConversation}
        />
      </div>
    </div>
  );
}

// Hardcoded bindings for Phase 7 — wiring into the Phase 1 shortcut table
// is tracked as a follow-up once user-scope shortcuts expose a generic
// keybinding registry (see features/agents/migration/phases/phase-07-chat-route.md).
const KEYBINDINGS = {
  newChat: { key: "k", meta: true },
  focusInput: { key: "/", meta: false },
  openAgentPicker: { key: "j", meta: true },
} as const;

export function ChatPageShell({
  activeConversationId,
  headerSlot,
  children,
}: ChatPageShellProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [historyOpen, setHistoryOpen] = useState(false);

  const focusInput = useCallback(() => {
    const el = document.querySelector<HTMLTextAreaElement>(
      "[data-agent-input-textarea]",
    );
    if (el) {
      el.focus();
      return;
    }
    const fallback = document.querySelector<HTMLTextAreaElement>("textarea");
    fallback?.focus();
  }, []);

  const openAgentPicker = useCallback(() => {
    const host = document.querySelector<HTMLElement>(
      "[data-chat-agent-picker-trigger]",
    );
    const btn = host?.querySelector<HTMLButtonElement>("button");
    btn?.click();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inTypableElement =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        (target as HTMLElement | null)?.isContentEditable;

      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === KEYBINDINGS.newChat.key
      ) {
        e.preventDefault();
        router.push("/chat/new");
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === KEYBINDINGS.openAgentPicker.key
      ) {
        e.preventDefault();
        openAgentPicker();
        return;
      }
      if (!inTypableElement && e.key === KEYBINDINGS.focusInput.key) {
        e.preventDefault();
        focusInput();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, focusInput, openAgentPicker]);

  const openConversation = useCallback(
    (conv: ConversationListItem) => {
      router.push(`/chat/${conv.conversationId}`);
    },
    [router],
  );

  const newChat = useCallback(() => {
    router.push("/chat/new");
  }, [router]);

  return (
    <div className="h-full flex overflow-hidden bg-textured">
      {!isMobile && (
        <aside
          className="hidden lg:flex w-64 shrink-0 border-r border-border flex-col"
          aria-label="Chat history"
        >
          <ChatHistoryPanel
            activeConversationId={activeConversationId}
            onOpenConversation={openConversation}
            onNewChat={newChat}
          />
        </aside>
      )}

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header
          className={cn(
            "shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4",
            "h-12 border-b border-border bg-card/60 backdrop-blur-sm",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <MessagesSquare className="w-4 h-4 text-muted-foreground shrink-0" />
            <div data-chat-agent-picker-trigger>{headerSlot}</div>
          </div>
          <div className="flex items-center gap-1">
            {isMobile && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs gap-1"
                onClick={() => setHistoryOpen(true)}
              >
                <History className="w-3.5 h-3.5" />
                History
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>

      {isMobile && (
        <Drawer open={historyOpen} onOpenChange={setHistoryOpen}>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader className="pb-1">
              <DrawerTitle className="text-sm">
                Conversation history
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 min-h-0 overflow-hidden pb-safe">
              <ChatHistoryPanel
                activeConversationId={activeConversationId}
                onOpenConversation={(conv) => {
                  setHistoryOpen(false);
                  router.push(`/chat/${conv.conversationId}`);
                }}
                onNewChat={() => {
                  setHistoryOpen(false);
                  router.push("/chat/new");
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
