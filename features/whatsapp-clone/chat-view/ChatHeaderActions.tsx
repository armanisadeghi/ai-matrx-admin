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
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <MoreVertical className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[200px] border-border bg-popover text-popover-foreground"
        >
          <DropdownMenuItem>Contact info</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onOpenMedia()}>
            Media, links and docs
          </DropdownMenuItem>
          <DropdownMenuItem>Mute notifications</DropdownMenuItem>
          <DropdownMenuItem>Disappearing messages</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Clear chat</DropdownMenuItem>
          <DropdownMenuItem className="text-rose-500">
            Block contact
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
