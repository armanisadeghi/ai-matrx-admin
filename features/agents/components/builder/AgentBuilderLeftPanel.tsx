"use client";

import { useRef, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentModelConfiguration } from "./AgentModelConfiguration";
import { Messages } from "@/features/agents/components/builder/message-builders/Messages";
import { AgentVariablesManager } from "@/features/agents/components/variables-management/AgentVariablesManager";
import { AgentContextSlotsManager } from "../context-slots-management/AgentContextSlotsManager";
import { SystemMessage } from "@/features/agents/components/builder/message-builders/system-instructions/SystemMessage";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectAgentMessages } from "@/features/agents/redux/agent-definition/selectors";
import { setAgentMessages } from "@/features/agents/redux/agent-definition/slice";
import type {
  AgentDefinitionMessage,
  TextBlock,
} from "@/features/agents/types/agent-message-types";
import type { DatabaseTool } from "@/utils/supabase/tools-service";

interface AgentBuilderLeftPanelProps {
  agentId: string;
  availableTools?: DatabaseTool[];
}

export function AgentBuilderLeftPanel({
  agentId,
  availableTools = [],
}: AgentBuilderLeftPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const allMessages = useAppSelector((state) =>
    selectAgentMessages(state, agentId),
  );

  const handleAddMessage = useCallback(
    (role: "user" | "assistant") => {
      if (!allMessages) return;
      const textBlock: TextBlock = { type: "text", text: "" };
      const newMessage: AgentDefinitionMessage = { role, content: [textBlock] };
      dispatch(
        setAgentMessages({
          id: agentId,
          messages: [...allMessages, newMessage],
        }),
      );
    },
    [agentId, allMessages, dispatch],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Top config — never scrolls */}
      <div className="flex flex-col gap-2 shrink-0 pt-0.5 pb-2">
        <AgentModelConfiguration
          agentId={agentId}
          availableTools={availableTools}
        />
        <AgentVariablesManager agentId={agentId} />
        <AgentContextSlotsManager agentId={agentId} />
      </div>

      {/* Scrollable messages area */}
      <div
        ref={scrollContainerRef}
        className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1"
      >
        <SystemMessage
          agentId={agentId}
          scrollContainerRef={scrollContainerRef}
        />
        <Messages agentId={agentId} scrollContainerRef={scrollContainerRef} />
        <div className="h-48 shrink-0" />
      </div>

      {/* Bottom add buttons — never scrolls */}
      <div className="flex items-center justify-end gap-1 shrink-0 py-2 border-t border-border bg-background">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => handleAddMessage("user")}
          disabled={!allMessages}
        >
          <Plus className="w-3 h-3 mr-1" />
          User
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => handleAddMessage("assistant")}
          disabled={!allMessages}
        >
          <Plus className="w-3 h-3 mr-1" />
          Assistant
        </Button>
      </div>
    </div>
  );
}
