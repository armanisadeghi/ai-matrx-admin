"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Bot,
  Settings,
  MessageSquare,
  Wrench,
  Variable,
  Layers,
} from "lucide-react";

export function AgentViewContent({ agentId }: { agentId: string }) {
  const agent = useAppSelector((state) => selectAgentById(state, agentId));

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Agent data loading...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Description */}
      {agent.description && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        </Card>
      )}

      {/* Overview grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Model */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bot className="w-4 h-4 text-primary" />
            Model
          </div>
          <p className="text-sm text-muted-foreground">
            {agent.modelId ?? "Default"}
          </p>
        </Card>

        {/* Messages */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="w-4 h-4 text-primary" />
            Messages
          </div>
          <p className="text-sm text-muted-foreground">
            {agent.messages?.length ?? 0} message
            {(agent.messages?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </Card>

        {/* Tools */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wrench className="w-4 h-4 text-primary" />
            Tools
          </div>
          <p className="text-sm text-muted-foreground">
            {(agent.tools?.length ?? 0) + (agent.customTools?.length ?? 0)} tool
            {(agent.tools?.length ?? 0) + (agent.customTools?.length ?? 0) !== 1
              ? "s"
              : ""}
          </p>
        </Card>

        {/* Variables */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Variable className="w-4 h-4 text-primary" />
            Variables
          </div>
          <p className="text-sm text-muted-foreground">
            {agent.variableDefinitions?.length ?? 0} variable
            {(agent.variableDefinitions?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </Card>

        {/* Context Slots */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Layers className="w-4 h-4 text-primary" />
            Context Slots
          </div>
          <p className="text-sm text-muted-foreground">
            {agent.contextSlots?.length ?? 0} slot
            {(agent.contextSlots?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </Card>

        {/* Settings */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings className="w-4 h-4 text-primary" />
            Settings
          </div>
          <p className="text-sm text-muted-foreground">
            {agent.settings
              ? `${Object.keys(agent.settings).length} configured`
              : "Default"}
          </p>
        </Card>
      </div>

      {/* Tags */}
      {agent.tags && agent.tags.length > 0 && (
        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-medium">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {agent.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
