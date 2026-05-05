"use client";

import { MoreVertical, Phone, Search, Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatHeaderActionsProps {
  onCallVoice?: () => void;
  onCallVideo?: () => void;
  onSearch?: () => void;
  onOpenMedia: () => void;
}

function IconButton({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[#aebac1] transition-colors hover:bg-[#374248] hover:text-white"
    >
      {children}
    </button>
  );
}

export function ChatHeaderActions({
  onCallVoice,
  onCallVideo,
  onSearch,
  onOpenMedia,
}: ChatHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <IconButton ariaLabel="Video call" onClick={onCallVideo}>
        <Video className="h-5 w-5" strokeWidth={1.75} />
      </IconButton>
      <IconButton ariaLabel="Voice call" onClick={onCallVoice}>
        <Phone className="h-[18px] w-[18px]" strokeWidth={2} />
      </IconButton>
      <IconButton ariaLabel="Search in chat" onClick={onSearch}>
        <Search className="h-5 w-5" strokeWidth={1.75} />
      </IconButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#aebac1] transition-colors hover:bg-[#374248] hover:text-white"
          >
            <MoreVertical className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[200px] border-[#2a3942] bg-[#233138] text-[#e9edef]"
        >
          <DropdownMenuItem className="focus:bg-[#2a3942]">
            Contact info
          </DropdownMenuItem>
          <DropdownMenuItem
            className="focus:bg-[#2a3942]"
            onSelect={() => onOpenMedia()}
          >
            Media, links and docs
          </DropdownMenuItem>
          <DropdownMenuItem className="focus:bg-[#2a3942]">
            Mute notifications
          </DropdownMenuItem>
          <DropdownMenuItem className="focus:bg-[#2a3942]">
            Disappearing messages
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#2a3942]" />
          <DropdownMenuItem className="focus:bg-[#2a3942]">
            Clear chat
          </DropdownMenuItem>
          <DropdownMenuItem className="text-[#f15c6d] focus:bg-[#2a3942]">
            Block contact
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
