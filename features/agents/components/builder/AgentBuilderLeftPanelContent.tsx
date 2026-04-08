"use client";

import { useRef } from "react";
import { Messages } from "@/features/agents/components/builder/message-builders/Messages";
import { SystemMessage } from "@/features/agents/components/builder/message-builders/system-instructions/SystemMessage";

interface AgentBuilderMessagesAreaProps {
  agentId: string;
}

export function AgentBuilderMessagesArea({
  agentId,
}: AgentBuilderMessagesAreaProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
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
  );
}
