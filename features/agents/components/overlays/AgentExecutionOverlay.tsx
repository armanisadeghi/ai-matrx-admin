"use client";

/**
 * AgentExecutionOverlay
 *
 * Renders the appropriate UI shell for an agent execution instance based on
 * its display mode. Mounted by the OverlayController for every instance
 * whose displayMode is NOT "direct" or "background".
 *
 * Display mode → component mapping:
 *   modal-full      → Large dialog with conversation + input
 *   modal-compact   → Smaller dialog with compact view
 *   chat-bubble     → Compact floating bubble that expands into a chat
 *   inline          → Minimal floating overlay for quick text operations
 *   sidebar         → FloatingSheet (right-side panel)
 *   flexible-panel  → Draggable/resizable FloatingPanel
 *   panel           → FloatingSheet with narrower width
 *   toast           → Fixed-position notification with live preview
 */

import { useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectDisplayMode,
  selectAllowChat,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import {
  selectLatestAccumulatedText,
  selectIsExecuting,
  selectIsStreaming,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { selectInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.selectors";
import { AgentConversationDisplay } from "../run/AgentConversationDisplay";
import { SmartAgentInput } from "../smart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  X,
  MessageSquare,
  Maximize2,
  Minimize2,
  CornerDownLeft,
  ArrowLeftToLine,
  ArrowRightFromLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingSheet from "@/components/official/FloatingSheet";
import { FloatingPanel } from "@/components/official-candidate/FloatingPanel";

// =============================================================================
// Full Modal — large dialog with full conversation + input
// =============================================================================

function AgentFullModal({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
          <span className="text-sm font-medium text-foreground">
            Agent Execution
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <AgentConversationDisplay instanceId={instanceId} />
        </div>

        <div className="shrink-0 border-t border-border">
          <SmartAgentInput
            instanceId={instanceId}
            sendButtonVariant="blue"
            showSubmitOnEnterToggle
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Compact Modal — smaller dialog
// =============================================================================

function AgentCompactModal({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-2 border-b border-border shrink-0">
          <DialogTitle className="text-sm">Agent</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-1">
          <AgentConversationDisplay instanceId={instanceId} />
        </div>

        <div className="shrink-0 border-t border-border">
          <SmartAgentInput
            instanceId={instanceId}
            sendButtonVariant="blue"
            compact
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Chat Bubble — compact floating bubble that expands into a mini chat
// =============================================================================

function AgentChatBubble({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const text = useAppSelector(selectLatestAccumulatedText(instanceId));
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

      <div className="flex-1 overflow-y-auto min-h-0">
        <AgentConversationDisplay instanceId={instanceId} />
      </div>

      <div className="shrink-0 border-t border-border">
        <SmartAgentInput
          instanceId={instanceId}
          sendButtonVariant="blue"
          compact
        />
      </div>
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
  const text = useAppSelector(selectLatestAccumulatedText(instanceId));
  const isStreaming = useAppSelector(selectIsStreaming(instanceId));
  const allowChat = useAppSelector(selectAllowChat(instanceId));

  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 w-[600px] bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">
          Agent Result
          {isStreaming && (
            <Badge variant="secondary" className="ml-2 text-[9px] h-4 px-1">
              Streaming
            </Badge>
          )}
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

      <div className="px-3 py-2 max-h-48 overflow-y-auto">
        {text ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{text}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Waiting for response...
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border bg-muted/20">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={onClose}
        >
          <CornerDownLeft className="w-3 h-3" />
          Replace
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={onClose}
        >
          <ArrowLeftToLine className="w-3 h-3" />
          Insert Before
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={onClose}
        >
          <ArrowRightFromLine className="w-3 h-3" />
          Insert After
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onClose}
        >
          Dismiss
        </Button>
      </div>

      {allowChat && (
        <div className="shrink-0 border-t border-border">
          <SmartAgentInput
            instanceId={instanceId}
            sendButtonVariant="blue"
            compact
          />
        </div>
      )}
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
  return (
    <FloatingSheet
      isOpen={true}
      onClose={onClose}
      title="Agent"
      position="right"
      width="2xl"
      height="full"
      closeOnBackdropClick={true}
      closeOnEsc={true}
      showCloseButton={true}
      contentClassName="p-0"
      lockScroll={false}
    >
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto min-h-0">
          <AgentConversationDisplay instanceId={instanceId} />
        </div>
        <div className="shrink-0 border-t border-border">
          <SmartAgentInput instanceId={instanceId} sendButtonVariant="blue" />
        </div>
      </div>
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
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute top-16 right-4 pointer-events-auto">
        <FloatingPanel
          title="Agent"
          size="2xl"
          onClose={onClose}
          bodyClassName="p-0"
        >
          <div className="flex flex-col h-[500px] overflow-hidden">
            <div className="flex-1 overflow-y-auto min-h-0">
              <AgentConversationDisplay instanceId={instanceId} />
            </div>
            <div className="shrink-0 border-t border-border">
              <SmartAgentInput
                instanceId={instanceId}
                sendButtonVariant="blue"
                compact
              />
            </div>
          </div>
        </FloatingPanel>
      </div>
    </div>
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
  return (
    <FloatingSheet
      isOpen={true}
      onClose={onClose}
      title="Agent"
      position="right"
      width="lg"
      height="full"
      closeOnBackdropClick={true}
      closeOnEsc={true}
      showCloseButton={true}
      contentClassName="p-0"
      lockScroll={false}
    >
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto min-h-0">
          <AgentConversationDisplay instanceId={instanceId} />
        </div>
        <div className="shrink-0 border-t border-border">
          <SmartAgentInput
            instanceId={instanceId}
            sendButtonVariant="blue"
            compact
          />
        </div>
      </div>
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
        <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2">
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {text || "Waiting..."}
          </p>
        </div>
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
    default:
      return null;
  }
}
