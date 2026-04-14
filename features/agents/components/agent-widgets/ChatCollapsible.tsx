"use client";

import { useState, useRef, useCallback } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectInstanceDisplayTitle } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectIsExecuting } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Loader2, Webhook, X } from "lucide-react";
import { AgentRunner } from "../smart/AgentRunner";

interface ChatCollapsibleProps {
  conversationId: string;
  onClose?: () => void;
}

export function ChatCollapsible({
  conversationId,
  onClose,
}: ChatCollapsibleProps) {
  const title = useAppSelector(selectInstanceDisplayTitle(conversationId));
  const isExecuting = useAppSelector(selectIsExecuting(conversationId));
  const [isOpen, setIsOpen] = useState(true);

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

  return (
    <div
      className="fixed z-50 bottom-4 right-4"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-96 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-right-5 duration-300"
      >
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 cursor-grab active:cursor-grabbing touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <CollapsibleTrigger asChild data-no-drag>
            <button className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
              <div className="p-0 rounded-full bg-primary/10 shrink-0">
                {isExecuting ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                ) : (
                  <Webhook className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
              <span className="text-xs font-medium text-foreground truncate">
                {title}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          {onClose && (
            <div className="shrink-0" data-no-drag>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        <CollapsibleContent className="data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up">
          <div className="h-[350px]">
            <AgentRunner
              conversationId={conversationId}
              compact
              className="h-full bg-background"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
