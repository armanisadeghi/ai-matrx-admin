"use client";

import {
  Archive,
  CircleDot,
  MessageCircle,
  PhoneIncoming,
  Settings,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { IconRailButton } from "./IconRailButton";
import { WAAvatar } from "../shared/WAAvatar";

export type RailKey =
  | "chats"
  | "calls"
  | "status"
  | "channels"
  | "communities"
  | "ai"
  | "archive"
  | "starred"
  | "settings";

interface IconRailProps {
  active: RailKey;
  onSelect: (key: RailKey) => void;
  onSettings: () => void;
  unreadChats?: number;
  hasMissedCalls?: boolean;
  userName?: string;
  userAvatarUrl?: string | null;
}

const TOP_ITEMS: Array<{
  key: RailKey;
  icon: typeof MessageCircle;
  label: string;
}> = [
  { key: "chats", icon: MessageCircle, label: "Chats" },
  { key: "calls", icon: PhoneIncoming, label: "Calls" },
  { key: "status", icon: CircleDot, label: "Status" },
  { key: "channels", icon: Sparkles, label: "Channels" },
  { key: "communities", icon: Users, label: "Communities" },
];

const SECONDARY_ITEMS: Array<{
  key: RailKey;
  icon: typeof Archive;
  label: string;
}> = [
  { key: "archive", icon: Archive, label: "Archived" },
  { key: "starred", icon: Star, label: "Starred messages" },
  { key: "ai", icon: Sparkles, label: "Meta AI" },
];

export function IconRail({
  active,
  onSelect,
  onSettings,
  unreadChats,
  hasMissedCalls,
  userName = "You",
  userAvatarUrl,
}: IconRailProps) {
  return (
    <div className="flex h-full w-[58px] flex-col items-center gap-1 bg-[#161b22] py-2">
      <div className="flex flex-col items-center gap-1">
        {TOP_ITEMS.map((item) => (
          <IconRailButton
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={active === item.key}
            badge={item.key === "chats" ? unreadChats : undefined}
            hasIndicator={item.key === "calls" ? hasMissedCalls : undefined}
            onClick={() => onSelect(item.key)}
          />
        ))}
      </div>

      <div className="mx-auto my-2 h-px w-7 bg-[#222e35]" />

      <div className="flex flex-col items-center gap-1">
        {SECONDARY_ITEMS.map((item) => (
          <IconRailButton
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={active === item.key}
            onClick={() => onSelect(item.key)}
          />
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-2 pb-1">
        <IconRailButton
          icon={Settings}
          label="Settings"
          onClick={onSettings}
        />
        <button
          type="button"
          aria-label="Profile"
          title={userName}
          className="rounded-full ring-0 transition hover:ring-2 hover:ring-[#2a3942]"
        >
          <WAAvatar
            name={userName}
            src={userAvatarUrl}
            size="sm"
            className="h-9 w-9"
          />
        </button>
      </div>
    </div>
  );
}
