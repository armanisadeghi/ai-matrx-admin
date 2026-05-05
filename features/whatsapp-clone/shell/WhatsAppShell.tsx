"use client";

import { useState } from "react";
import {
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TitleBar } from "./TitleBar";
import { IconRail, type RailKey } from "./IconRail";
import { PaneDivider } from "./PaneDivider";
import { ConversationListPane } from "../conversation-list/ConversationListPane";
import { ChatViewPane } from "../chat-view/ChatViewPane";
import { useWhatsAppConversations } from "../hooks/useWhatsAppConversations";
import { ModalProvider, useWAModals } from "../modals/ModalContext";
import { SettingsModal } from "../modals/settings/SettingsModal";
import { MediaModal } from "../modals/media/MediaModal";
import { NewConversationDialog } from "@/features/messaging/components/NewConversationDialog";

interface WhatsAppShellProps {
  userName?: string;
  userAvatarUrl?: string | null;
}

function ShellInner({ userName, userAvatarUrl }: WhatsAppShellProps) {
  const [activeRail, setActiveRail] = useState<RailKey>("chats");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const { conversations, selectedId, select } = useWhatsAppConversations();
  const { open, openSettings, openMedia, close } = useWAModals();
  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const unreadChats = conversations.reduce(
    (s, c) => s + (c.unreadCount || 0),
    0,
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-card text-foreground">
      <TitleBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <IconRail
          active={activeRail}
          onSelect={setActiveRail}
          onSettings={openSettings}
          onOpenMedia={openMedia}
          unreadChats={unreadChats}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
        />
        <ResizablePanelGroup
          orientation="horizontal"
          id="wa-shell-split"
          className="flex-1"
        >
          <ResizablePanel
            id="wa-list"
            order={1}
            defaultSize="32%"
            minSize="22%"
            maxSize="50%"
          >
            <ConversationListPane
              conversations={conversations}
              selectedId={selectedId}
              onSelect={select}
              onNewChat={() => setNewChatOpen(true)}
            />
          </ResizablePanel>
          <PaneDivider />
          <ResizablePanel
            id="wa-chat"
            order={2}
            defaultSize="68%"
            minSize="40%"
          >
            <ChatViewPane conversation={selected} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <SettingsModal
        open={open === "settings"}
        onOpenChange={(o) => (o ? openSettings() : close())}
        userName={userName}
        userAvatarUrl={userAvatarUrl}
      />
      <MediaModal
        open={open === "media"}
        onOpenChange={(o) => (o ? openMedia() : close())}
      />
      <NewConversationDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onConversationCreated={(id) => {
          setNewChatOpen(false);
          select(id);
        }}
      />
    </div>
  );
}

export function WhatsAppShell(props: WhatsAppShellProps) {
  return (
    <ModalProvider>
      <ShellInner {...props} />
    </ModalProvider>
  );
}
