'use client';

import React, { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TbListSearch } from "react-icons/tb";
import { IoCreateOutline } from "react-icons/io5";
import Link from "next/link";
import { ConversationSearchOverlay } from "@/features/chat/components/conversations/ConversationSearchOverlay";
import { useAppDispatch } from "@/lib/redux";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";

interface ChatHeaderCompactProps {
  baseRoute?: string;
}

export function ChatHeaderCompact({ baseRoute = "/chat" }: ChatHeaderCompactProps) {
  const dispatch = useAppDispatch();
  const chatActions = getChatActionsWithThunks();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Critical initialization that was in the old header
  useEffect(() => {
    dispatch(chatActions.initialize());
  }, [dispatch, chatActions]);

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 h-full bg-textured">
        {/* Mobile - Always dropdown */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link href={baseRoute} className="flex items-center w-full">
                  <IoCreateOutline className="h-4 w-4 mr-2" />
                  New Chat
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenSearch}>
                <TbListSearch className="h-4 w-4 mr-2" />
                Search Conversations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop - Inline controls with tight spacing */}
        <div className="hidden md:flex items-center gap-1">
          {/* New Chat Button */}
          <Link href={baseRoute}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="New Chat"
            >
              <IoCreateOutline className="h-3 w-3" />
            </Button>
          </Link>

          {/* Search Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={handleOpenSearch}
            title="Search Conversations"
          >
            <TbListSearch className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Conversation Search Overlay */}
      <ConversationSearchOverlay 
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
      />
    </>
  );
}
