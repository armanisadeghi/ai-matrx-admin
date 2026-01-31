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
            size="icon"
            onClick={handleClick}
            className={cn(
              "relative h-9 w-9",
              isOpen && "bg-zinc-100 dark:bg-zinc-800",
              className
            )}
            aria-label={`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <MessageSquare className="h-5 w-5" />

            {/* Unread Badge */}
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className={cn(
                  "absolute -top-1 -right-1 h-5 min-w-[20px] px-1",
                  "flex items-center justify-center text-[10px] font-bold",
                  "bg-red-500 hover:bg-red-500"
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Messages{unreadCount > 0 ? ` (${unreadCount} unread)` : ""}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default MessageIcon;
