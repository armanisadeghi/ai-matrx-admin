"use client";

// The conversation page's Usage & Cost and Errors views. Every number is THIS conversation's own
// rows (chat.request + chat.tool_call where conversation_id = it) — a user request can fan out
// across several conversations, so its total is shown beside this conversation's share, never as it.

import AppLink from "@/components/navigation/AppLink";
import { Badge, type BadgeTone } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { adminCostColumns } from "@/components/cost/adminCostColumns";
import { useAdminCost } from "@/components/cost/useAdminCost";
import { CxEmptyState } from "@/features/cx-dashboard/components/CxEmptyState";
import {
  formatDate,
  formatDuration,
  formatTokens,
  truncateId,
} from "@/features/cx-dashboard/utils/format";
import type {
  CxConversationUsage,
  CxRelatedConversationCost,
  CxRequest,
  CxToolCall,
  CxUserRequest,
} from "@/features/cx-dashboard/types/cxDashboardTypes";
import { AlertTriangle, Bot, GitBranch, Layers, Wrench, Zap } from "lucide-react";
import type { ReactNode } from "react";

const statusTone = (status: string): BadgeTone =>
  status === "error" || status === "failed" ? "destructive" : status === "completed" ? "success" : "neutral";

const CONVERSATION_HREF = (id: string) => `/administration/chat/cx-dashboard/conversations/${id}`;
const REQUEST_HREF = (id: string) => `/administration/chat/cx-dashboard/requests/${id}`;

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        {icon}
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      </div>
      <div className="p-2">{children}</div>
    </section>
  );
}

type ModelRow = CxConversationUsage["by_model"][number];
type ToolRow = CxConversationUsage["by_tool"][number];

const modelColumns: MatrxColumnDef<ModelRow>[] = [
  { id: "model_name", accessorKey: "model_name", header: "Model", width: 200 },
  { id: "provider", accessorKey: "provider", header: "Provider", width: 120, filter: "select" },
  { id: "calls", accessorKey: "calls", header: "Calls", align: "right", width: 80 },
  ...adminCostColumns<ModelRow>({ id: "cost", value: (r) => r.cost }),
  { id: "input_tokens", accessorKey: "input_tokens", header: "Input", align: "right", width: 90, cell: (r) => formatTokens(r.input_tokens) },
  { id: "output_tokens", accessorKey: "output_tokens", header: "Output", align: "right", width: 90, cell: (r) => formatTokens(r.output_tokens) },
  { id: "cached_tokens", accessorKey: "cached_tokens", header: "Cached", align: "right", width: 90, cell: (r) => formatTokens(r.cached_tokens) },
  { id: "avg_duration_ms", accessorKey: "avg_duration_ms", header: "Avg time", align: "right", width: 90, cell: (r) => formatDuration(r.avg_duration_ms) },
];

const toolColumns: MatrxColumnDef<ToolRow>[] = [
  { id: "tool_name", accessorKey: "tool_name", header: "Tool", width: 220 },
  { id: "calls", accessorKey: "calls", header: "Calls", align: "right", width: 80 },
  { id: "errors", accessorKey: "errors", header: "Errors", align: "right", width: 80 },
  ...adminCostColumns<ToolRow>({ id: "cost", value: (r) => r.cost }),
  { id: "avg_duration_ms", accessorKey: "avg_duration_ms", header: "Avg time", align: "right", width: 90, cell: (r) => formatDuration(r.avg_duration_ms) },
];

const callColumns: MatrxColumnDef<CxRequest>[] = [
  { id: "created_at", accessorKey: "created_at", header: "When", width: 130, cell: (r) => formatDate(r.created_at) },
  {
    id: "user_request_id",
    accessorKey: "user_request_id",
    header: "Request",
    width: 110,
    cell: (r) => (
      <AppLink href={REQUEST_HREF(r.user_request_id)} className="font-mono text-xs hover:underline">
        {truncateId(r.user_request_id)}
      </AppLink>
    ),
  },
  { id: "iteration", accessorKey: "iteration", header: "Iter", align: "right", width: 60 },
  { id: "model", header: "Model", accessorFn: (r) => r.model_name ?? "", filter: "select", width: 170, cell: (r) => r.model_name || "—" },
  { id: "input_tokens", accessorKey: "input_tokens", header: "Input", align: "right", width: 90, cell: (r) => formatTokens(r.input_tokens) },
  { id: "output_tokens", accessorKey: "output_tokens", header: "Output", align: "right", width: 90, cell: (r) => formatTokens(r.output_tokens) },
  { id: "cached_tokens", accessorKey: "cached_tokens", header: "Cached", align: "right", width: 90, cell: (r) => formatTokens(r.cached_tokens) },
  ...adminCostColumns<CxRequest>({ id: "cost", value: (r) => r.cost }),
  { id: "api_duration_ms", accessorKey: "api_duration_ms", header: "Time", align: "right", width: 90, cell: (r) => formatDuration(r.api_duration_ms) },
  {
    id: "finish_reason",
    header: "Finish",
    accessorFn: (r) => r.finish_reason ?? "",
    filter: "select",
    width: 110,
    cell: (r) =>
      r.finish_reason ? (
        <Badge tone={r.finish_reason === "stop" ? "neutral" : "warning"}>{r.finish_reason}</Badge>
      ) : (
        <span className="text-xs italic text-muted-foreground">intermediate</span>
      ),
  },
];

const relatedColumns: MatrxColumnDef<CxRelatedConversationCost>[] = [
  {
    id: "title",
    header: "Conversation",
    accessorFn: (r) => r.title ?? "",
    width: 280,
    cell: (r) => (
      <AppLink href={CONVERSATION_HREF(r.id)} className="hover:underline">
        {r.title || <span className="font-mono text-muted-foreground">{truncateId(r.id, 12)}</span>}
      </AppLink>
    ),
  },
  { id: "model_calls", accessorKey: "model_calls", header: "Model calls", align: "right", width: 100 },
  ...adminCostColumns<CxRelatedConversationCost>({ id: "cost", value: (r) => r.cost }),
  { id: "total_tokens", accessorKey: "total_tokens", header: "Tokens", align: "right", width: 100, cell: (r) => formatTokens(r.total_tokens) },
];

export function ConversationUsageView({
  usage,
  modelCalls,
}: {
  usage: CxConversationUsage;
  modelCalls: CxRequest[];
}) {
  const formatAdminCost = useAdminCost();
  const t = usage.totals;
  const siblingCost = usage.siblings.reduce((s, c) => s + c.cost, 0);
  const subAgentCost = usage.sub_agents.reduce((s, c) => s + c.cost, 0);

  if (t.model_calls === 0 && t.tool_calls === 0 && usage.sub_agents.length === 0) {
    return <CxEmptyState title="No usage recorded" description="This conversation made no model or tool calls." />;
  }

  const lines: { label: string; value: number; strong?: boolean }[] = [
    { label: "Model calls", value: t.model_cost },
    { label: "Tool calls", value: t.tool_cost },
    { label: "This conversation", value: t.cost, strong: true },
  ];
  if (usage.sub_agents.length > 0) {
    lines.push({ label: `Sub-agents (${usage.sub_agents.length})`, value: subAgentCost });
    lines.push({ label: "With sub-agents", value: t.cost + subAgentCost, strong: true });
  }

  return (
    <div className="space-y-4">
      <Section icon={<Layers className="h-3.5 w-3.5 text-muted-foreground" />} title="Cost breakdown">
        <dl className="max-w-md divide-y divide-border/50 text-xs">
          {lines.map((l) => (
            <div key={l.label} className="flex items-center justify-between px-1 py-1.5">
              <dt className={l.strong ? "font-medium" : "text-muted-foreground"}>{l.label}</dt>
              <dd className={l.strong ? "font-mono font-semibold" : "font-mono"}>{formatAdminCost(l.value)}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section icon={<Bot className="h-3.5 w-3.5 text-muted-foreground" />} title={`By model (${usage.by_model.length})`}>
        <MatrxDataTable
          urlState={{ id: "cx-conv-models" }}
          data={usage.by_model}
          columns={modelColumns}
          getRowId={(r) => r.model_name}
          pageSize={25}
          emptyState={{ title: "No model calls" }}
        />
      </Section>

      <Section icon={<Zap className="h-3.5 w-3.5 text-muted-foreground" />} title={`Every model call (${modelCalls.length})`}>
        <MatrxDataTable
          urlState={{ id: "cx-conv-calls" }}
          data={modelCalls}
          columns={callColumns}
          getRowId={(r) => r.id}
          pageSize={25}
          emptyState={{ title: "No model calls" }}
          toolbar={{ search: true, searchPlaceholder: "Search calls…" }}
        />
      </Section>

      {usage.by_tool.length > 0 && (
        <Section icon={<Wrench className="h-3.5 w-3.5 text-muted-foreground" />} title={`By tool (${usage.by_tool.length})`}>
          <MatrxDataTable
            urlState={{ id: "cx-conv-tools" }}
            data={usage.by_tool}
            columns={toolColumns}
            getRowId={(r) => r.tool_name}
            pageSize={25}
            emptyState={{ title: "No tool calls" }}
          />
        </Section>
      )}

      {usage.sub_agents.length > 0 && (
        <Section icon={<GitBranch className="h-3.5 w-3.5 text-muted-foreground" />} title={`Sub-agents (${usage.sub_agents.length})`}>
          <MatrxDataTable
            urlState={{ id: "cx-conv-subagents" }}
            data={usage.sub_agents}
            columns={relatedColumns}
            getRowId={(r) => r.id}
            pageSize={25}
            emptyState={{ title: "No sub-agents" }}
          />
        </Section>
      )}

      {usage.siblings.length > 0 && (
        <Section
          icon={<GitBranch className="h-3.5 w-3.5 text-muted-foreground" />}
          title={`Same requests, other conversations (${usage.siblings.length}) · ${formatAdminCost(siblingCost)}`}
        >
          <MatrxDataTable
            urlState={{ id: "cx-conv-siblings" }}
            data={usage.siblings}
            columns={relatedColumns}
            getRowId={(r) => r.id}
            pageSize={25}
            emptyState={{ title: "None" }}
          />
        </Section>
      )}
    </div>
  );
}

export function ConversationErrorsView({
  userRequests,
  modelCalls,
  toolCalls,
}: {
  userRequests: CxUserRequest[];
  modelCalls: CxRequest[];
  toolCalls: CxToolCall[];
}) {
  const failedRequests = userRequests.filter((ur) => ur.status === "error" || !!ur.error || ur.finish_reason === "max_tokens");
  const truncatedCalls = modelCalls.filter((r) => r.finish_reason === "max_tokens");
  const failedTools = toolCalls.filter((tc) => tc.is_error === true || tc.success === false);

  if (failedRequests.length + truncatedCalls.length + failedTools.length === 0) {
    return <CxEmptyState title="No errors" description="Every request and tool call in this conversation finished cleanly." />;
  }

  return (
    <div className="space-y-4">
      {failedRequests.length > 0 && (
        <Section icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />} title={`Requests (${failedRequests.length})`}>
          <div className="space-y-1">
            {failedRequests.map((ur) => (
              <AppLink key={ur.id} href={REQUEST_HREF(ur.id)} className="flex items-start gap-3 rounded p-2 text-xs hover:bg-muted/50">
                <span className="font-mono text-muted-foreground">{truncateId(ur.id)}</span>
                <Badge tone={statusTone(ur.status)}>{ur.status}</Badge>
                {ur.finish_reason === "max_tokens" && <Badge tone="warning">max_tokens</Badge>}
                <span className="min-w-0 flex-1 truncate text-destructive">{ur.error ?? ""}</span>
                <span className="text-muted-foreground">{formatDate(ur.created_at)}</span>
              </AppLink>
            ))}
          </div>
        </Section>
      )}

      {truncatedCalls.length > 0 && (
        <Section icon={<Zap className="h-3.5 w-3.5 text-destructive" />} title={`Model calls cut off at max tokens (${truncatedCalls.length})`}>
          <div className="space-y-1">
            {truncatedCalls.map((r) => (
              <AppLink key={r.id} href={REQUEST_HREF(r.user_request_id)} className="flex items-center gap-3 rounded p-2 text-xs hover:bg-muted/50">
                <span className="font-mono text-muted-foreground">{truncateId(r.user_request_id)}</span>
                <span>iter {r.iteration}</span>
                <span>{r.model_name ?? "—"}</span>
                <span className="text-muted-foreground">{formatTokens(r.output_tokens)} out</span>
                <span className="ml-auto text-muted-foreground">{formatDate(r.created_at)}</span>
              </AppLink>
            ))}
          </div>
        </Section>
      )}

      {failedTools.length > 0 && (
        <Section icon={<Wrench className="h-3.5 w-3.5 text-destructive" />} title={`Tool calls (${failedTools.length})`}>
          <div className="space-y-1">
            {failedTools.map((tc) => {
              const row = (
                <>
                  <span className="font-medium">{tc.tool_name}</span>
                  {tc.error_type && <Badge>{tc.error_type}</Badge>}
                  <span className="min-w-0 flex-1 truncate text-destructive">{tc.error_message ?? ""}</span>
                  <span className="text-muted-foreground">{formatDate(tc.started_at)}</span>
                </>
              );
              return tc.user_request_id ? (
                <AppLink key={tc.id} href={REQUEST_HREF(tc.user_request_id)} className="flex items-center gap-3 rounded p-2 text-xs hover:bg-muted/50">
                  {row}
                </AppLink>
              ) : (
                <div key={tc.id} className="flex items-center gap-3 p-2 text-xs">{row}</div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
