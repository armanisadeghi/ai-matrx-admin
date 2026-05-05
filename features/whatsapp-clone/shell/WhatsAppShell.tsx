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

interface WhatsAppShellProps {
  userName?: string;
  userAvatarUrl?: string | null;
}

function ShellInner({ userName, userAvatarUrl }: WhatsAppShellProps) {
  const [activeRail, setActiveRail] = useState<RailKey>("chats");
  const { conversations, selectedId, select } = useWhatsAppConversations();
  const { open, openSettings, close } = useWAModals();
  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const unreadChats = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0b141a]">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <IconRail
          active={activeRail}
          onSelect={setActiveRail}
          onSettings={openSettings}
          unreadChats={unreadChats}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
        />
        <ResizablePanelGroup
          orientation="horizontal"
          className="flex-1"
          autoSaveId="whatsapp-clone-main-split"
        >
          <ResizablePanel
            defaultSize={32}
            minSize={24}
            maxSize={45}
            id="list"
            order={1}
          >
            <ConversationListPane
              conversations={conversations}
              selectedId={selectedId}
              onSelect={select}
            />
          </ResizablePanel>
          <PaneDivider />
          <ResizablePanel defaultSize={68} minSize={40} id="chat" order={2}>
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
        onOpenChange={(o) => (o ? null : close())}
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
