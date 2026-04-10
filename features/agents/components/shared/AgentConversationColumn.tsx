"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowDown } from "lucide-react";
import { AgentConversationDisplay } from "../run/AgentConversationDisplay";
import { CreatorRunPanel } from "../run-controls/CreatorRunPanel";
import { SmartAgentInput } from "../inputs/SmartAgentInput";
import { cn } from "@/lib/utils";

interface SmartInputForwardProps {
  sendButtonVariant?: "default" | "blue";
  showAutoClearToggle?: boolean;
  showSubmitOnEnterToggle?: boolean;
  placeholder?: string;
  compact?: boolean;
  extraRightControls?: React.ReactNode;
}

interface AgentConversationColumnProps {
  conversationId: string;
  surfaceKey: string;
  constrainWidth?: boolean;
  smartInputProps?: SmartInputForwardProps;
}

export function AgentConversationColumn({
  conversationId,
  surfaceKey,
  constrainWidth = false,
  smartInputProps,
}: AgentConversationColumnProps) {
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
        constrainWidth && "w-full max-w-3xl mx-auto",
      )}
    >
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto"
        >
          <AgentConversationDisplay conversationId={conversationId} />
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

      <CreatorRunPanel conversationId={conversationId} surfaceKey={surfaceKey} />

      <SmartAgentInput
        conversationId={conversationId}
        surfaceKey={surfaceKey}
        {...smartInputProps}
      />
    </div>
  );
}
