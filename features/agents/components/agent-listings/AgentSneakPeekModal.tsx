"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentById,
  selectAgentDefinition,
  selectAgentReadyForBuilder,
} from "@/features/agents/redux/agent-definition/selectors";
import { fetchFullAgent } from "@/features/agents/redux/agent-definition/thunks";
import { selectModelLabelById } from "@/features/ai-models/redux/modelRegistrySlice";
import { fetchModelOptions } from "@/features/ai-models/redux/modelRegistrySlice";
import {
  selectAllTools,
  selectToolsReady,
} from "@/features/agents/redux/tools/tools.selectors";
import { fetchAvailableTools } from "@/features/agents/redux/tools/tools.thunks";
import type { AgentDefinitionMessage } from "@/features/agents/types/agent-message-types";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Loader2,
  Pencil,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-service";

const SYSTEM_PROMPT_PREVIEW_CHARS = 1000;
const MESSAGE_PREVIEW_CHARS = 500;

function extractTextContent(msg: AgentDefinitionMessage | undefined): string {
  if (!msg?.content || !Array.isArray(msg.content)) return "";
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");
}

function TruncatedText({
  text,
  previewChars,
}: {
  text: string;
  previewChars: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > previewChars;
  const displayed =
    !needsTruncation || expanded
      ? text
      : text.slice(0, previewChars).trimEnd() + "…";

  return (
    <div className="text-sm text-foreground whitespace-pre-wrap break-words">
      {displayed}
      {needsTruncation && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-1 text-xs font-medium text-primary hover:underline focus:outline-none"
        >
          {expanded ? "Show less" : "See more"}
        </button>
      )}
    </div>
  );
}

function Section({
  label,
  children,
  className,
  labelClassName,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <section className={cn("space-y-1", className)}>
      <div
        className={cn(
          "text-[0.65rem] font-semibold uppercase tracking-wider text-primary",
          labelClassName,
        )}
      >
        {label}
      </div>
      <div>{children}</div>
    </section>
  );
}

function EmptyValue() {
  return <span className="text-sm text-muted-foreground italic">—</span>;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="text-[0.625rem] uppercase tracking-wider text-muted-foreground w-28 shrink-0">
        {label}
      </span>
      <span
        className={cn("text-xs text-foreground break-all", mono && "font-mono")}
      >
        {value ?? <EmptyValue />}
      </span>
    </div>
  );
}

interface AgentSneakPeekModalProps {
  agentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentSneakPeekModal({
  agentId,
  isOpen,
  onClose,
}: AgentSneakPeekModalProps) {
  const dispatch = useAppDispatch();

  const record = useAppSelector((state) => selectAgentById(state, agentId));
  const definition = useAppSelector((state) =>
    selectAgentDefinition(state, agentId),
  );
  const isReady = useAppSelector((state) =>
    selectAgentReadyForBuilder(state, agentId),
  );
  const modelLabel = useAppSelector((state) =>
    selectModelLabelById(state, record?.modelId ?? null),
  );
  const allTools = useAppSelector(selectAllTools);
  const toolsReady = useAppSelector(selectToolsReady);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyDefinition = async () => {
    if (!definition) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(definition, null, 2));
      setCopied(true);
      toast.success("Agent definition copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!isReady) {
      dispatch(fetchFullAgent(agentId));
    }
    dispatch(fetchModelOptions());
    dispatch(fetchAvailableTools());
  }, [isOpen, isReady, agentId, dispatch]);

  const systemPromptText = useMemo(() => {
    const sys = record?.messages?.find((m) => m.role === "system");
    return extractTextContent(sys);
  }, [record?.messages]);

  const additionalMessages = useMemo(
    () => (record?.messages ?? []).filter((m) => m.role !== "system"),
    [record?.messages],
  );

  const variableNames = useMemo(
    () => (record?.variableDefinitions ?? []).map((v) => v.name),
    [record?.variableDefinitions],
  );

  const toolNames = useMemo(() => {
    const builtin = (record?.tools ?? []).map((id) => {
      const t = allTools.find((x) => x.id === id);
      return t?.name ?? id;
    });
    const custom = (record?.customTools ?? []).map((t) => t.name);
    return [...builtin, ...custom];
  }, [record?.tools, record?.customTools, allTools]);

  const loading = !isReady;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-xl bg-card border border-border p-5 gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle className="text-base font-semibold text-foreground pr-6">
          {record?.name ?? "Agent"}
        </DialogTitle>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading agent details…
          </div>
        )}

        {!loading && record && (
          <div className="space-y-4 overflow-y-auto max-h-[65vh] -mr-2 pr-2">
            <Section label="Description">
              {record.description ? (
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {record.description}
                </p>
              ) : (
                <EmptyValue />
              )}
            </Section>

            <Section label="System Prompt">
              {systemPromptText ? (
                <TruncatedText
                  text={systemPromptText}
                  previewChars={SYSTEM_PROMPT_PREVIEW_CHARS}
                />
              ) : (
                <EmptyValue />
              )}
            </Section>

            <Section label="Model">
              {modelLabel ? (
                <span className="text-sm text-foreground">{modelLabel}</span>
              ) : record.modelId ? (
                <span className="text-sm text-muted-foreground italic">
                  Loading…
                </span>
              ) : (
                <EmptyValue />
              )}
            </Section>

            <Section
              label={`Variables${variableNames.length ? ` (${variableNames.length})` : ""}`}
            >
              {variableNames.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {variableNames.map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-foreground"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyValue />
              )}
            </Section>

            <Section
              label={`Tools${toolNames.length ? ` (${toolNames.length})` : ""}`}
            >
              {toolNames.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {toolNames.map((n, i) => (
                    <span
                      key={`${n}-${i}`}
                      className={cn(
                        "inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-foreground",
                        !toolsReady && "opacity-70",
                      )}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyValue />
              )}
            </Section>

            <Section
              label={`Additional Messages${additionalMessages.length ? ` (${additionalMessages.length})` : ""}`}
            >
              {additionalMessages.length ? (
                <div className="space-y-2">
                  {additionalMessages.map((m, i) => {
                    const text = extractTextContent(m);
                    return (
                      <div
                        key={i}
                        className="rounded-md border border-border bg-muted/30 p-2.5"
                      >
                        <div className="text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          {m.role}
                        </div>
                        {text ? (
                          <TruncatedText
                            text={text}
                            previewChars={MESSAGE_PREVIEW_CHARS}
                          />
                        ) : (
                          <EmptyValue />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyValue />
              )}
            </Section>

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {advancedOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  Advanced
                </button>
                <button
                  type="button"
                  onClick={handleCopyDefinition}
                  disabled={!definition}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none disabled:opacity-50"
                  title="Copy full agent definition as JSON"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Copied" : "Copy JSON"}
                </button>
              </div>

              {advancedOpen && (
                <div className="mt-2 rounded-md bg-muted/30 p-3">
                  <MetaRow label="ID" value={record.id} mono />
                  <MetaRow label="Type" value={record.agentType} />
                  <MetaRow label="Version" value={record.version ?? "—"} />
                  <MetaRow label="Category" value={record.category ?? "—"} />
                  <MetaRow
                    label="Tags"
                    value={record.tags?.length ? record.tags.join(", ") : "—"}
                  />
                  <MetaRow
                    label="Active"
                    value={record.isActive ? "Yes" : "No"}
                  />
                  <MetaRow
                    label="Public"
                    value={record.isPublic ? "Yes" : "No"}
                  />
                  <MetaRow
                    label="Archived"
                    value={record.isArchived ? "Yes" : "No"}
                  />
                  <MetaRow
                    label="Favorite"
                    value={record.isFavorite ? "Yes" : "No"}
                  />
                  <MetaRow label="Access" value={record.accessLevel ?? "—"} />
                  <MetaRow
                    label="Created"
                    value={formatDateTime(record.createdAt)}
                  />
                  <MetaRow
                    label="Updated"
                    value={formatDateTime(record.updatedAt)}
                  />
                  <MetaRow
                    label="Model ID"
                    value={record.modelId ?? "—"}
                    mono
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && record && (
          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Link href={`/agents/${agentId}/build`} onClick={onClose}>
              <Button variant="outline" size="sm">
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            </Link>
            <Link href={`/agents/${agentId}/run`} onClick={onClose}>
              <Button size="sm">
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Run
              </Button>
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
