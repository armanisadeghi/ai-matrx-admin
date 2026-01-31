"use client";

import React from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import {
  selectMessagingIsOpen,
  selectTotalUnreadCount,
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
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageIconProps {
  className?: string;
}

/**
 * MessageIcon - Header button for opening messaging side sheet
 * 
 * Features:
 * - Shows unread message count badge
 * - Toggles messaging side sheet
 * - Tooltip on hover
 */
export function MessageIcon({ className }: MessageIconProps) {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectMessagingIsOpen);
  const unreadCount = useAppSelector(selectTotalUnreadCount);

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
              "relative p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 backdrop-blur-sm transition-all duration-200 ease-in-out hover:scale-105 active:scale-95",
              isOpen && "bg-zinc-200 dark:bg-zinc-700",
              className
            )}
          >
            <MessageCircle
              className={cn(
                "w-4 h-4 transition-all duration-200 ease-in-out",
                isOpen
                  ? "text-primary"
                  : "text-zinc-700 dark:text-zinc-300"
              )}
            />

            {/* Unread Badge */}
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-medium min-w-[20px] bg-red-500 hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-600"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {unreadCount > 0
              ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
              : "Messages"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default MessageIcon;
