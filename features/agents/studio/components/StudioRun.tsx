"use client";

/**
 * One conversation inside a Studio pane, drawn from the platform's canvas conversation hook
 * (`useCanvasWorkspaceConversation`, owned by the page): the ONE runner (`AgentRunner`) once it is
 * ready, the hook's own honest states before that. This pane launches nothing, reopens nothing and
 * keeps no ledger — the hook does (open → `resumeConversation`, reconnect, unsent text, the address).
 */

import { ErrorNotice } from "@ai-matrx/design-system";
import { Button, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { AgentRunner } from "@ai-matrx/chat/agents/components/smart/AgentRunner";
import type { CanvasWorkspaceConversation } from "@ai-matrx/chat/canvas/workspace/useCanvasWorkspaceConversation";
import { StudioTurnModel } from "./StudioTurnModel";
import { PaneBar } from "./PaneBar";

interface StudioRunProps {
  conversation: CanvasWorkspaceConversation;
  surfaceKey: string;
  /** The "Next reply on" bar above an agent's run; off for the assistant and where the host draws it. */
  turnModelBar?: boolean;
  /** What failed, for the error notice ("Open the Studio assistant", "Run the agent"). */
  operation: string;
}

export function StudioRun({ conversation, surfaceKey, turnModelBar = false, operation }: StudioRunProps) {
  if (conversation.state === "failed") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <ErrorNotice
          size="compact"
          title={conversation.purpose === "open" ? "This chat could not open" : "This chat could not start"}
          message={conversation.reason}
          operation={operation}
          onRetry={conversation.retry}
        />
      </div>
    );
  }
  if (conversation.state === "needs-organization") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <Button variant="primary" onClick={conversation.choose}>
          Choose an organization
        </Button>
      </div>
    );
  }
  if (conversation.state !== "ready") return <RegionSkeleton />;
  return (
    <div className="flex h-full min-h-0 flex-col">
      {turnModelBar ? (
        <PaneBar>
          <StudioTurnModel conversationId={conversation.conversationId} />
        </PaneBar>
      ) : null}
      <AgentRunner conversationId={conversation.conversationId} surfaceKey={surfaceKey} className="min-h-0 flex-1" />
    </div>
  );
}
