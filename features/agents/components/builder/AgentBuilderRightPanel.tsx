"use client";

/**
 * AgentBuilderRightPanel — Test Run Panel
 *
 * Uses createManualInstance which reads from agentDefinition.agents[agentId] —
 * including dirty (unsaved) fields. So the test run always reflects the
 * current in-memory builder state, whether saved or not.
 */

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useAgentLauncher } from "@ai-matrx/chat/agents/hooks/useAgentLauncher";
import { useBuilderContextSeed } from "@ai-matrx/chat/agents/hooks/useBuilderContextSeed";
import {
  registerSurface,
  unregisterSurface,
} from "@ai-matrx/chat/agents/redux/surfaces/surfaces.slice";
import { AgentConversationColumn } from "@ai-matrx/chat/agents/components/shared/AgentConversationColumn";
import { SmartAgentInput } from "@ai-matrx/chat/agents/components/inputs/smart-input/SmartAgentInput";
import { useComposerMode } from "@ai-matrx/chat/agents/components/inputs/smart-input/composer/useComposerMode";
import { useCompactInputMaxHeight } from "@ai-matrx/chat/agents/components/inputs/smart-input/composer/useCompactInputMaxHeight";
import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { ModelViewPanel } from "../model-view/ModelViewPanel";
import { AgentSamplesLauncher } from "../samples/AgentSamplesLauncher";
import type { ConversationInvocation } from "@ai-matrx/chat/agents/types/conversation-invocation.types";

type RightView = "test" | "model";

const RIGHT_VIEWS = [
  { value: "test", label: "Test" },
  { value: "model", label: "Model view" },
] as const;

interface AgentBuilderRightPanelProps {
  agentId: string;
}

export function AgentBuilderRightPanel({
  agentId,
}: AgentBuilderRightPanelProps) {
  const dispatch = useAppDispatch();
  const [view, setView] = useState<RightView>("test");
  // On a phone the Build/Test tabs frame already clears the shell header.
  const isMobile = useIsMobile();
  const sourceFeature = "agent-builder";
  const surfaceKey = `${sourceFeature}:${agentId}`;
  const { mode: composerMode } = useComposerMode();
  const { measureRef, maxInputHeightPx } = useCompactInputMaxHeight();

  // Register as a `window` surface — forking during a test run should
  // swap the test panel's conversation in place via setFocus, NOT
  // change the builder's URL (the builder route doesn't carry a
  // conversationId; it's keyed on the agent being edited).
  useEffect(() => {
    dispatch(
      registerSurface({
        surfaceKey,
        kind: "window",
      }),
    );
    return () => {
      dispatch(unregisterSurface(surfaceKey));
    };
  }, [dispatch, surfaceKey]);

  const agentOptions: ConversationInvocation = {
    identity: { surfaceKey },
    engine: { kind: "agent", agentId },
    routing: { apiEndpointMode: "manual" },
    origin: { origin: "manual", sourceFeature },
    // This test conversation IS the agent being built. The surrounding
    // agent-builder surface remains available to outside assists, but feeding
    // its prompts/settings back into the tested agent would be self-context.
    scope: { surfaceName: null },
    display: {
      showAutoClearToggle: true,
      autoClearConversation: true,
      showVariablePanel: true,
    },
    behavior: {
      autoRun: false,
      allowChat: true,
    },
  };

  const { conversationId, displayConversationId } = useAgentLauncher(
    agentId,
    agentOptions,
  );

  // Seed the builder's saved context-policy values into every new conversation
  // (initial + reset + autoclear split) so the engineer's test data travels
  // with the instance without having to re-enter it.
  useBuilderContextSeed(conversationId, agentId);

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Initializing...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("shrink-0 px-2 pb-1", !isMobile && "pt-[var(--shell-header-h)]")}>
        <SegmentedControl
          aria-label="Right panel view"
          value={view}
          onValueChange={setView}
          data={RIGHT_VIEWS}
        />
      </div>
      {/* Both stay mounted: switching never restarts the test conversation. The one
          composer moves with the view — in the Model view it sits under the request,
          and what is typed there (with its variables and context) is what the view shows. */}
      <div
        ref={measureRef}
        className={cn("flex min-h-0 flex-1 flex-col", view !== "test" && "hidden")}
      >
        <div className="min-h-0 flex-1">
          <AgentConversationColumn
            conversationId={conversationId}
            displayConversationId={displayConversationId ?? undefined}
            surfaceKey={surfaceKey}
            hideInput={view !== "test"}
            aboveInput={
              <AgentSamplesLauncher
                agentId={agentId}
                conversationId={conversationId}
                className="px-2 pb-1"
              />
            }
            smartInputProps={{
              // The compact composer (composer/FEATURE.md) — this is a side
              // panel. The agent is FIXED to the one being built, so no agent
              // switch is offered (the pill is a plain label).
              composer: { size: "compact", mode: composerMode, maxInputHeightPx },
            }}
          />
        </div>
      </div>
      {view === "model" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <ModelViewPanel agentId={agentId} conversationId={conversationId} />
          </div>
          <SmartAgentInput
            conversationId={conversationId}
            surfaceKey={surfaceKey}
            disableSend
            composer={{ size: "compact", mode: composerMode, maxInputHeightPx }}
          />
        </div>
      ) : null}
    </div>
  );
}
