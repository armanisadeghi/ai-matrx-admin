"use client";

import React from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import {
  selectTotalUnreadCount,
  selectMessagingIsOpen,
  toggleMessaging,
} from "../redux/messagingSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageIconProps {
  className?: string;
}

export function MessageIcon({ className }: MessageIconProps) {
  const dispatch = useAppDispatch();
  const unreadCount = useAppSelector(selectTotalUnreadCount);
  const isOpen = useAppSelector(selectMessagingIsOpen);

  const handleClick = () => {
    dispatch(toggleMessaging());
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            className={cn(
              "relative p-2 rounded-full glass overflow-visible transition-all duration-200 ease-in-out hover:scale-105 active:scale-95",
              isOpen && "glass-strong",
              className
            )}
            aria-label={`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <MessageSquare className="h-4 w-4" />

            {/* Unread Badge - positioned at top-right corner, slightly inset to avoid header clipping */}
            {unreadCount > 0 && (
              <Badge
                className={cn(
                  "absolute top-0.5 -right-1 h-4 min-w-[16px] px-1",
                  "flex items-center justify-center text-[9px] font-semibold",
                  "bg-primary hover:bg-primary border-0"
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Messages{unreadCount > 0 ? ` (${unreadCount} unread)` : ""}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default MessageIcon;
