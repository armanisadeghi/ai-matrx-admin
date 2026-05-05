"use client";

import {
  HardDrive,
  HelpCircle,
  Heart,
  History,
  KeyRound,
  Lock,
  MessageCircle,
  BellRing,
} from "lucide-react";
import { ModalShell } from "../ModalShell";
import { WAAvatar } from "../../shared/WAAvatar";
import { AccountPanel } from "./panels/AccountPanel";
import { SecurityNotificationsPanel } from "./panels/SecurityNotificationsPanel";
import {
  RowGroup,
  SimplePanel,
  ToggleRow,
} from "./panels/SimplePanel";
import type { ModalNavItem } from "../../types";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
  userAvatarUrl?: string | null;
}

export function SettingsModal({
  open,
  onOpenChange,
  userName = "Armani",
  userAvatarUrl,
}: SettingsModalProps) {
  const navItems: ModalNavItem[] = [
    {
      id: "favorites",
      label: "Favorites",
      icon: Heart,
      panel: (
        <SimplePanel intro="Pin the chats and messages you reach for the most. Add them from any conversation's menu.">
          <RowGroup>
            <ToggleRow label="Show favorites in chat list" defaultChecked />
            <ToggleRow label="Show favorites in search" defaultChecked />
          </RowGroup>
        </SimplePanel>
      ),
    },
    {
      id: "chat-history",
      label: "Chat history",
      icon: History,
      panel: (
        <SimplePanel intro="Manage your local chat history, exports and backups.">
          <RowGroup>
            <ToggleRow label="Sync history to this device" defaultChecked />
            <ToggleRow label="Include media in backups" />
            <ToggleRow label="Auto-delete after 1 year" />
          </RowGroup>
        </SimplePanel>
      ),
    },
    {
      id: "account",
      label: "Account",
      icon: KeyRound,
      panel: (ctx) => <AccountPanel ctx={ctx} />,
      children: [
        {
          id: "security-notifications",
          label: "Security notifications",
          icon: Lock,
          panel: <SecurityNotificationsPanel />,
        },
      ],
    },
    {
      id: "privacy",
      label: "Privacy",
      icon: Lock,
      panel: (
        <SimplePanel intro="Control who sees your information and how your data is shared.">
          <RowGroup>
            <ToggleRow
              label="Read receipts"
              description="Send blue check marks when messages are read."
              defaultChecked
            />
            <ToggleRow
              label="Last seen and online"
              description="Choose who can see when you were last active."
              defaultChecked
            />
            <ToggleRow
              label="Profile photo"
              description="Choose who can see your profile photo."
            />
          </RowGroup>
        </SimplePanel>
      ),
    },
    {
      id: "chats",
      label: "Chats",
      icon: MessageCircle,
      panel: (
        <SimplePanel intro="Customize your chats — appearance, wallpapers, language, and more.">
          <RowGroup>
            <ToggleRow label="Enter to send" defaultChecked />
            <ToggleRow label="Send with sound" />
            <ToggleRow label="Spell check" defaultChecked />
            <ToggleRow label="Replace text with emoji" defaultChecked />
          </RowGroup>
        </SimplePanel>
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: BellRing,
      panel: (
        <SimplePanel intro="Control how AI Matrx Messenger notifies you of new messages, calls and updates.">
          <RowGroup>
            <ToggleRow label="Show desktop notifications" defaultChecked />
            <ToggleRow label="Notification sounds" defaultChecked />
            <ToggleRow label="Show preview" defaultChecked />
            <ToggleRow label="Reaction notifications" />
          </RowGroup>
        </SimplePanel>
      ),
    },
    {
      id: "storage",
      label: "Storage and data",
      icon: HardDrive,
      panel: (
        <SimplePanel intro="Manage media storage, network usage, and downloads.">
          <RowGroup>
            <ToggleRow
              label="Auto-download media on Wi-Fi"
              defaultChecked
            />
            <ToggleRow label="Auto-download media on cellular" />
            <ToggleRow label="Use less data for calls" defaultChecked />
          </RowGroup>
        </SimplePanel>
      ),
    },
    {
      id: "help",
      label: "Help",
      icon: HelpCircle,
      panel: (
        <SimplePanel intro="Get help, contact support, and read the latest release notes.">
          <RowGroup>
            <ToggleRow label="Send analytics to AI Matrx" defaultChecked />
          </RowGroup>
        </SimplePanel>
      ),
    },
  ];

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      navItems={navItems}
      initialNavId="account"
      footer={{ primaryLabel: "Done" }}
      headerSlot={
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <WAAvatar name={userName} src={userAvatarUrl} size="lg" />
          <div className="min-w-0">
            <div className="truncate text-[16px] font-medium text-[#e9edef]">
              {userName}
            </div>
          </div>
        </div>
      }
    />
  );
}
