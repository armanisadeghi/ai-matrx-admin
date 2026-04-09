"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectNeedsPreExecutionInput,
  selectInstanceDisplayTitle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectIsExecuting } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectTurnCount } from "@/features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors";
import { ExecutionManager } from "../execution-gates/ExecutionManager";
import { AssistantCardStack } from "./AssistantCardStack";
import { CompactAssistantInput } from "./CompactAssistantInput";
import { AssistantControlBar } from "./AssistantControlBar";
import { useAssistantHeartbeat } from "./useAssistantHeartbeat";
import { X } from "lucide-react";

interface AgentChatAssistantProps {
  conversationId: string;
  stackIndex?: number;
  onClose: () => void;
}

export function AgentChatAssistant({
  conversationId,
  stackIndex = 0,
  onClose,
}: AgentChatAssistantProps) {
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(conversationId),
  );
  const title = useAppSelector(selectInstanceDisplayTitle(conversationId));
  const isExecuting = useAppSelector(selectIsExecuting(conversationId));
  const turnCount = useAppSelector(selectTurnCount(conversationId));

  const { heartbeatInterval, increaseHeartbeat, decreaseHeartbeat } =
    useAssistantHeartbeat(conversationId);

  const [isOpen, setIsOpen] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevTurnCountRef = useRef(turnCount);

  useEffect(() => {
    const delta = turnCount - prevTurnCountRef.current;
    prevTurnCountRef.current = turnCount;
    if (!isOpen && delta > 0) {
      setUnreadCount((c) => c + delta);
    }
  }, [turnCount, isOpen]);

  // ── Drag state ───────────────────────────────────────────────────────────
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: position.x,
        origY: position.y,
      };
    },
    [position],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPosition({
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  };

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  if (needsPreExecution) return <ExecutionManager conversationId={conversationId} />;

  const bottomOffset = 16 + stackIndex * 56;
  const rightOffset = 16 + stackIndex * 320;

  return (
    <div
      className={`fixed z-[200] transition-all duration-300 ${
        isExiting ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
      }`}
      style={{
        bottom: `${bottomOffset}px`,
        right: `${rightOffset}px`,
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex: 200 + stackIndex,
      }}
    >
      {/* Card panel — visible when open */}
      {isOpen && (
        <div className="mb-2 animate-in slide-in-from-bottom-4 fade-in-0 duration-300">
          <div className="w-72 max-h-[70vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header — draggable */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isExecuting && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                )}
                <span className="text-xs font-medium text-foreground truncate">
                  {title}
                </span>
              </div>
              <div className="shrink-0" data-no-drag>
                <button
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                  onClick={handleDismiss}
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Card stack */}
            <AssistantCardStack conversationId={conversationId} />

            {/* Compact input */}
            <CompactAssistantInput conversationId={conversationId} />
          </div>
        </div>
      )}

      {/* FAB + controls */}
      <div className="flex justify-end">
        <AssistantControlBar
          isOpen={isOpen}
          onToggle={handleToggle}
          unreadCount={unreadCount}
          heartbeatInterval={heartbeatInterval}
          onHeartbeatUp={increaseHeartbeat}
          onHeartbeatDown={decreaseHeartbeat}
        />
      </div>
    </div>
  );
}
