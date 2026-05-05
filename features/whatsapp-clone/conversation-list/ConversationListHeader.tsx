"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, SquarePen } from "lucide-react";

export function ConversationListHeader() {
  return (
    <div className="flex h-[60px] shrink-0 items-center justify-between px-5 pt-2">
      <h1 className="text-[22px] font-semibold leading-none text-[#e9edef]">
        Chats
      </h1>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More options"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#aebac1] transition-colors hover:bg-[#2a3942] hover:text-white"
            >
              <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[200px] border-[#2a3942] bg-[#233138] text-[#e9edef]"
          >
            <DropdownMenuItem className="focus:bg-[#2a3942]">
              New group
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-[#2a3942]">
              New community
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-[#2a3942]">
              Starred messages
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-[#2a3942]">
              Select chats
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#2a3942]" />
            <DropdownMenuItem className="focus:bg-[#2a3942]">
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-[#2a3942]">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          aria-label="New chat"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#aebac1] transition-colors hover:bg-[#2a3942] hover:text-white"
        >
          <SquarePen className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
