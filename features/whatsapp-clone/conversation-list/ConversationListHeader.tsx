"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, SquarePen } from "lucide-react";

interface ConversationListHeaderProps {
  onNewChat?: () => void;
}

export function ConversationListHeader({
  onNewChat,
}: ConversationListHeaderProps = {}) {
  return (
    <div className="flex h-[60px] shrink-0 items-center justify-between px-5 pt-2">
      <h1 className="text-[22px] font-semibold leading-none text-foreground">
        Chats
      </h1>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More options"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[200px] border-border bg-popover text-popover-foreground"
          >
            <DropdownMenuItem>New group</DropdownMenuItem>
            <DropdownMenuItem>New community</DropdownMenuItem>
            <DropdownMenuItem>Starred messages</DropdownMenuItem>
            <DropdownMenuItem>Select chats</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          aria-label="New chat"
          onClick={onNewChat}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <SquarePen className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
