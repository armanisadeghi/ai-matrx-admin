"use client";

/**
 * AgentExecutionOverlay
 *
 * Renders the appropriate UI shell for an agent execution instance based on
 * its display mode. Mounted by the OverlayController for every instance
 * whose displayMode is NOT "direct" or "background".
 *
 * Each shell is a thin layout wrapper. ALL execution logic, visibility
 * filtering, pre-execution gating, auto-run, and input control live inside
 * AgentRunner — the single inner component used by every shell.
 */

import { useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectDisplayMode } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import {
  selectLatestAccumulatedText,
  selectIsExecuting,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectInstanceDisplayTitle } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { AgentRunner } from "../smart/AgentRunner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, MessageSquare, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingSheet from "@/components/official/FloatingSheet";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { AgentFloatingChat } from "./AgentFloatingChat";
import { ChatCollapsible } from "./ChatCollapsible";

// =============================================================================
// Full Modal
// =============================================================================

function AgentFullModal({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  const title = useAppSelector(selectInstanceDisplayTitle(instanceId));

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <span className="text-sm font-medium text-foreground truncate">
            {title ?? "Agent Execution"}
          </span>
        </div>
        <AgentRunner
          instanceId={instanceId}
          className="flex-1 min-h-0 bg-background"
        />
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Compact Modal
// =============================================================================

function AgentCompactModal({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  const title = useAppSelector(selectInstanceDisplayTitle(instanceId));

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl h-[60vh] max-h-[70vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <span className="text-sm font-medium text-foreground truncate">
            {title ?? "Agent"}
          </span>
        </div>
        <AgentRunner
          instanceId={instanceId}
          compact
          className="flex-1 min-h-0 bg-background"
        />
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Chat Bubble
// =============================================================================

function AgentChatBubble({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isExecuting = useAppSelector(selectIsExecuting(instanceId));

  if (!expanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setExpanded(true)}
        >
          <MessageSquare className="w-5 h-5" />
          {isExecuting && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[500px] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0 bg-muted/30">
        <span className="text-xs font-medium">Agent Chat</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setExpanded(false)}
          >
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <AgentRunner instanceId={instanceId} compact className="flex-1 min-h-0" />
    </div>
  );
}

// =============================================================================
// Inline — minimal floating overlay for quick text operations
// =============================================================================

function AgentInlineOverlay({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 w-[600px] max-h-[60vh] bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          Agent Result
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onClose}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
      <AgentRunner
        instanceId={instanceId}
        compact
        className="flex-1 min-h-0 bg-background"
      />
    </div>
  );
}

// =============================================================================
// Sidebar — right-side FloatingSheet
// =============================================================================

function AgentSidebarOverlay({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  const title = useAppSelector(selectInstanceDisplayTitle(instanceId));

  return (
    <FloatingSheet
      isOpen={true}
      onClose={onClose}
      title={title}
      position="right"
      width="2xl"
      height="full"
      closeOnBackdropClick={true}
      closeOnEsc={true}
      showCloseButton={true}
      contentClassName="p-0"
      lockScroll={false}
    >
      <AgentRunner instanceId={instanceId} className="h-full bg-background" />
    </FloatingSheet>
  );
}

// =============================================================================
// Flexible Panel — draggable/resizable floating panel
// =============================================================================

function AgentFlexiblePanelOverlay({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  const title = useAppSelector(selectInstanceDisplayTitle(instanceId));

  return (
    <WindowPanel
      id={`agent-${instanceId}`}
      title={title}
      onClose={onClose}
      width={680}
      height={500}
      minWidth={300}
      minHeight={250}
      bodyClassName="p-0"
      urlSyncKey="agent"
      urlSyncId={instanceId}
      urlSyncArgs={{ m: "flexible-panel" }}
    >
      <AgentRunner instanceId={instanceId} className="h-full bg-background" />
    </WindowPanel>
  );
}

// =============================================================================
// Panel — narrower side sheet
// =============================================================================

function AgentPanelOverlay({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  const title = useAppSelector(selectInstanceDisplayTitle(instanceId));

  return (
    <FloatingSheet
      isOpen={true}
      onClose={onClose}
      title={title}
      position="right"
      width="lg"
      height="full"
      closeOnBackdropClick={true}
      closeOnEsc={true}
      showCloseButton={true}
      contentClassName="p-0"
      lockScroll={false}
    >
      <AgentRunner instanceId={instanceId} className="h-full bg-background" />
    </FloatingSheet>
  );
}

// =============================================================================
// Toast — fixed-position notification with live text preview
// =============================================================================

function AgentToastOverlay({
  instanceId,
  onClose,
  index,
}: {
  instanceId: string;
  onClose: () => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = useAppSelector(selectLatestAccumulatedText(instanceId));
  const isExecuting = useAppSelector(selectIsExecuting(instanceId));

  if (expanded) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          zIndex: 200 + index,
        }}
        className="w-96 h-[400px] bg-card border border-border rounded-lg shadow-lg overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border shrink-0">
          <span className="text-xs font-medium">Agent Response</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setExpanded(false)}
            >
              <Minimize2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={onClose}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <AgentRunner
          instanceId={instanceId}
          compact
          className="flex-1 min-h-0 bg-background"
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: `${16 + index * 100}px`,
        right: "16px",
        zIndex: 200 + index,
      }}
      className="w-80 bg-card border border-border rounded-lg shadow-lg overflow-hidden cursor-pointer"
      onClick={() => setExpanded(true)}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border">
        <span className="text-xs font-medium text-foreground truncate">
          Agent
        </span>
        <div className="flex items-center gap-1.5">
          {isExecuting && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1">
              Running
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="px-3 py-2 max-h-24 overflow-y-auto">
        {text ? (
          <p className="text-xs text-foreground line-clamp-4">{text}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {isExecuting ? "Processing..." : "Waiting..."}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Overlay Router
// =============================================================================

interface AgentExecutionOverlayProps {
  instanceId: string;
  index?: number;
  onClose: () => void;
}

export function AgentExecutionOverlay({
  instanceId,
  index = 0,
  onClose,
}: AgentExecutionOverlayProps) {
  const displayMode = useAppSelector(selectDisplayMode(instanceId));

  if (!displayMode) return null;

  switch (displayMode) {
    case "modal-full":
      return <AgentFullModal instanceId={instanceId} onClose={onClose} />;
    case "modal-compact":
      return <AgentCompactModal instanceId={instanceId} onClose={onClose} />;
    case "chat-bubble":
      return <AgentChatBubble instanceId={instanceId} onClose={onClose} />;
    case "inline":
      return <AgentInlineOverlay instanceId={instanceId} onClose={onClose} />;
    case "sidebar":
      return <AgentSidebarOverlay instanceId={instanceId} onClose={onClose} />;
    case "flexible-panel":
      return (
        <AgentFlexiblePanelOverlay instanceId={instanceId} onClose={onClose} />
      );
    case "panel":
      return <AgentPanelOverlay instanceId={instanceId} onClose={onClose} />;
    case "toast":
      return (
        <AgentToastOverlay
          instanceId={instanceId}
          onClose={onClose}
          index={index}
        />
      );
    case "floating-chat":
      return <AgentFloatingChat instanceId={instanceId} onClose={onClose} />;
    case "chat-collapsible":
      return <ChatCollapsible instanceId={instanceId} />;
    default:
      return null;
  }
}
