"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowDown } from "lucide-react";
import { AgentConversationDisplay } from "../messages-display/AgentConversationDisplay";
import { CreatorRunPanel } from "../run-controls/CreatorRunPanel";
import { SmartAgentInput } from "../inputs/smart-input/SmartAgentInput";

import { cn } from "@/lib/utils";

interface SmartInputForwardProps {
  sendButtonVariant?: "default" | "blue";
  showSubmitOnEnterToggle?: boolean;
  placeholder?: string;
  compact?: boolean;
  extraRightControls?: React.ReactNode;
}

interface AgentConversationColumnProps {
  /**
   * Conversation bound to the smart input / variables panel. In the default
   * case this is also the display id (see below).
   */
  conversationId: string;
  /**
   * Optional — conversation bound to the conversation display / history.
   * Defaults to `conversationId`. Only diverges under the autoclear split
   * flow: the user just submitted and the input has jumped to a freshly-
   * prepped conversation while the display stays on the one streaming.
   */
  displayConversationId?: string;
  surfaceKey: string;
  constrainWidth?: boolean;
  smartInputProps?: SmartInputForwardProps;
}

export function AgentConversationColumn({
  conversationId,
  displayConversationId,
  surfaceKey,
  constrainWidth = false,
  smartInputProps,
}: AgentConversationColumnProps) {
  const displayId = displayConversationId ?? conversationId;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distanceFromBottom > 120);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  return (
    <div
      className={cn(
        "h-full flex flex-col overflow-hidden",
        constrainWidth && "w-full max-w-3xl mx-auto pb-2",
      )}
    >
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto pt-12"
        >
          <AgentConversationDisplay
            conversationId={displayId}
            surfaceKey={surfaceKey}
          />
        </div>
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-3"
          style={{
            background:
              "linear-gradient(to bottom, transparent, var(--background))",
          }}
        />
        {showScrollDown && (
          <button
            type="button"
            onClick={scrollToBottom}
            className={cn(
              "absolute bottom-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full",
              "matrx-glass-core shadow-lg text-muted-foreground hover:text-foreground",
              "transition-all duration-200 ease-out animate-in fade-in slide-in-from-bottom-2",
            )}
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      <CreatorRunPanel
        conversationId={conversationId}
        surfaceKey={surfaceKey}
      />

      <SmartAgentInput
        conversationId={conversationId}
        surfaceKey={surfaceKey}
        {...smartInputProps}
      />
    </div>
  );
}
