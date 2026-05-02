// @ts-nocheck

// features/quick-actions/components/QuickChatSheet.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquarePlus,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useShortcutTrigger } from "@/features/agents/hooks/useShortcutTrigger";
import { AgentRunner } from "@/features/agents/components/smart/AgentRunner";
import { extractErrorMessage } from "@/utils/errors";

interface QuickChatSheetProps {
  onClose?: () => void;
  className?: string;
}

// TODO(prompt-to-agent-sweep): The "Matrx Custom Chat" agent shortcut id below
// (e9e9639d-2970-4125-870e-09c1e9b7462f) was discovered by querying
// `agx_shortcut` for the agent that previously sat behind
// `prompt_builtins['matrix-custom-chat']`. Treating it as a hard-coded id keeps
// us coupled to the migration's 1:1 mapping and bypasses the agent system's
// shortcut discovery flow. When this surface gets its proper rebuild, drive
// the chat from a configurable shortcut/agent reference (e.g. `useShortcut()`
// or a feature-flagged "default chat" lookup) instead of a literal uuid, and
// drop the `displayMode: "direct"` override once the embedding contract is
// reflected in the shortcut row itself.
const MATRX_CUSTOM_CHAT_SHORTCUT_ID = "e9e9639d-2970-4125-870e-09c1e9b7462f";

/**
 * QuickChatSheet — AI chat surface that hosts an agent conversation inline.
 *
 * Triggers the "Matrx Custom Chat" agent shortcut on mount with
 * `displayMode: "direct"` so no overlay opens; the resulting conversation is
 * rendered in-place via `<AgentRunner />`.
 */
export function QuickChatSheet({ onClose, className }: QuickChatSheetProps) {
  const trigger = useShortcutTrigger();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const initializeChat = useCallback(async () => {
    setIsInitializing(true);
    setInitError(null);
    try {
      await trigger(MATRX_CUSTOM_CHAT_SHORTCUT_ID, {
        sourceFeature: "quick-actions",
        surfaceKey: "quick-chat-sheet",
        config: { displayMode: "direct" },
        onConversationCreated: (cid) => setConversationId(cid),
      });
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      console.error("[QuickChatSheet] Failed to initialize chat:", error);
      setInitError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  }, [trigger]);

  useEffect(() => {
    if (!conversationId && !isInitializing && !initError) {
      initializeChat();
    }
  }, [conversationId, isInitializing, initError, initializeChat]);

  const handleNewChat = useCallback(async () => {
    setConversationId(null);
    setInitError(null);
    await initializeChat();
  }, [initializeChat]);

  const isReady = conversationId && !isInitializing;

  return (
    <div className={cn("relative h-full", className)}>
      <div className="absolute top-2 right-2 z-50 flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                onClick={handleNewChat}
                disabled={isInitializing}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Chat</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {onClose && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  onClick={onClose}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="h-full">
        {initError ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-destructive max-w-md p-4">
              <AlertCircle className="h-8 w-8" />
              <span className="text-sm font-medium">
                Failed to initialize chat
              </span>
              <span className="text-xs text-muted-foreground text-center break-all">
                {initError}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                className="mt-2 gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          </div>
        ) : isReady && conversationId ? (
          <AgentRunner
            key={conversationId}
            conversationId={conversationId}
            className="h-full"
            surfaceKey="quick-chat-sheet"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Starting chat...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
