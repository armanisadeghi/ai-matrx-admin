"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Cuboid, Zap } from "lucide-react";
import { ChatPageShell } from "./ChatPageShell";
import { ChatRoomClient } from "./ChatRoomClient";
import { AgentListDropdown } from "@/features/agents/components/agent-listings/AgentListDropdown";

export function ChatNewClient() {
  const router = useRouter();
  const params = useSearchParams();
  const agentId = params.get("agentId") ?? undefined;

  if (agentId) {
    return <ChatRoomClient agentId={agentId} />;
  }

  const selectAgent = (id: string) =>
    router.replace(`/chat/new?agentId=${encodeURIComponent(id)}`);

  return (
    <ChatPageShell pickerPlaceholder="New chat" onAgentSelect={selectAgent}>
      <div className="flex-1 min-h-0 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Start a new chat
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pick an agent to begin. Your own agents, system agents, and
              community agents all live here.
            </p>
          </div>
          <AgentListDropdown
            onSelect={selectAgent}
            label="Choose an agent"
            className="h-10 px-4 text-sm"
          />
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Cuboid className="w-3 h-3" />
            Tip: press{" "}
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">
              ⌘K
            </kbd>{" "}
            anywhere to open a new chat.
          </p>
        </div>
      </div>
    </ChatPageShell>
  );
}
