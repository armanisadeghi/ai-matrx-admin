"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentById,
  selectAgentMessages,
  selectAgentVariableDefinitions,
  selectAgentSettings,
  selectAgentTools,
  selectAgentCustomTools,
  selectAgentContextSlots,
  selectAgentModelId,
  selectAgentVersion,
  selectAgentTags,
} from "@/features/agents/redux/agent-definition/selectors";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Webhook,
  MessageSquare,
  Wrench,
  Variable,
  Layers,
  Settings,
  Tag,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentDefinitionMessage } from "@/features/agents/types/agent-message-types";

function extractTextContent(msg: AgentDefinitionMessage): string {
  if (!msg.content || !Array.isArray(msg.content)) return "";
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    system:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    user: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    assistant:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[0.6875rem] font-semibold border capitalize",
        colors[role] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {role}
    </span>
  );
}

export function AgentViewContent({ agentId }: { agentId: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const agent = useAppSelector((state) => selectAgentById(state, agentId));
  const messages = useAppSelector((state) =>
    selectAgentMessages(state, agentId),
  );
  const variables = useAppSelector((state) =>
    selectAgentVariableDefinitions(state, agentId),
  );
  const settings = useAppSelector((state) =>
    selectAgentSettings(state, agentId),
  );
  const tools = useAppSelector((state) => selectAgentTools(state, agentId));
  const customTools = useAppSelector((state) =>
    selectAgentCustomTools(state, agentId),
  );
  const contextSlots = useAppSelector((state) =>
    selectAgentContextSlots(state, agentId),
  );
  const modelId = useAppSelector((state) => selectAgentModelId(state, agentId));
  const version = useAppSelector((state) =>
    selectAgentVersion(state, agentId),
  );
  const tags = useAppSelector((state) => selectAgentTags(state, agentId));

  if (!mounted || !agent) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading agent data...
      </div>
    );
  }

  const systemMessage = messages?.find((m) => m.role === "system");
  const conversationMessages =
    messages?.filter((m) => m.role !== "system") ?? [];
  const totalTools = (tools?.length ?? 0) + (customTools?.length ?? 0);

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ paddingTop: "var(--shell-header-h)" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Top info bar */}
        <div className="flex flex-wrap items-center gap-3">
          {agent.description && (
            <p className="text-sm text-muted-foreground flex-1 min-w-[200px]">
              {agent.description}
            </p>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {modelId && (
              <Badge variant="secondary" className="gap-1">
                <Webhook className="w-3 h-3" /> {modelId}
              </Badge>
            )}
            {version != null && (
              <Badge variant="outline" className="gap-1 tabular-nums">
                <Hash className="w-3 h-3" /> v{version}
              </Badge>
            )}
            {!agent.isActive && <Badge variant="destructive">Inactive</Badge>}
          </div>
        </div>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* System prompt */}
        {systemMessage && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                System Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap font-mono bg-muted/50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                {extractTextContent(systemMessage) || "—"}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Conversation messages */}
        {conversationMessages.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-primary" />
                Example Messages ({conversationMessages.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {conversationMessages.map((msg, i) => (
                <div key={i} className="space-y-1">
                  <RoleBadge role={msg.role} />
                  <pre className="text-sm whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                    {extractTextContent(msg) || "—"}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Variables */}
        {variables && variables.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Variable className="w-4 h-4 text-purple-500" />
                Variables ({variables.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {variables.map((v) => (
                  <div
                    key={v.name}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30"
                  >
                    <code className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                      {`{{${v.name}}}`}
                    </code>
                    <div className="flex-1 min-w-0 text-sm">
                      {v.defaultValue != null && (
                        <span className="text-muted-foreground">
                          Default: {String(v.defaultValue)}
                        </span>
                      )}
                      {v.helpText && (
                        <span className="text-muted-foreground/70 text-xs">
                          {v.helpText}
                        </span>
                      )}
                    </div>
                    {v.required && (
                      <Badge
                        variant="outline"
                        className="text-[0.625rem] shrink-0"
                      >
                        required
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tools */}
        {totalTools > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Wrench className="w-4 h-4 text-orange-500" />
                Tools ({totalTools})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tools?.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="font-mono text-xs"
                  >
                    {t}
                  </Badge>
                ))}
                {customTools?.map((t) => (
                  <Badge
                    key={t.name}
                    variant="outline"
                    className="font-mono text-xs gap-1"
                  >
                    {t.name}
                    <span className="text-muted-foreground">(custom)</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Context Slots */}
        {contextSlots && contextSlots.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4 text-cyan-500" />
                Context Slots ({contextSlots.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {contextSlots.map((slot, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30"
                  >
                    <code className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                      {slot.key}
                    </code>
                    {slot.label && (
                      <span className="text-sm text-muted-foreground">
                        {slot.label}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[0.625rem]">
                      {slot.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings */}
        {settings && Object.keys(settings).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4 text-muted-foreground" />
                Model Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(settings)
                  .filter(([, v]) => v != null)
                  .map(([key, value]) => (
                    <div key={key} className="space-y-0.5">
                      <div className="text-[0.625rem] uppercase tracking-wider text-muted-foreground font-medium">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="text-sm font-mono">{String(value)}</div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
