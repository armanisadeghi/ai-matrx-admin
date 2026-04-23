"use client";

/**
 * MemoryStateInspector
 *
 * Admin-only view of the raw `cx_observational_memory` row for a conversation.
 * Shows the actual `active_observations` text (what's being injected on every
 * turn), plus the buffered observation/reflection state, generation counter,
 * token counts, and metadata.
 *
 * We query Supabase directly with the RLS'd client — non-admin users will
 * see an empty result even if they somehow reach this component, and admins
 * will see the full row.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Database,
  FileText,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";
import type { Tables } from "@/types/database.types";
import { formatDateTime, formatRelativeTime, formatTokens } from "./format";

type MemoryRow = Tables<"cx_observational_memory">;

interface MemoryStateInspectorProps {
  conversationId: string;
  /** Auto-fetch on mount. */
  autoFetch?: boolean;
  className?: string;
}

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; row: MemoryRow | null }
  | { status: "error"; error: string };

export function MemoryStateInspector({
  conversationId,
  autoFetch = true,
  className,
}: MemoryStateInspectorProps) {
  const [state, setState] = useState<FetchState>({ status: "idle" });

  const fetchRow = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const { data, error } = await supabase
        .from("cx_observational_memory")
        .select("*")
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setState({ status: "error", error: error.message });
        return;
      }
      setState({ status: "success", row: (data as MemoryRow) ?? null });
    } catch (e) {
      setState({
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, [conversationId]);

  useEffect(() => {
    if (!autoFetch) return;
    void fetchRow();
  }, [autoFetch, fetchRow]);

  return (
    <div
      className={cn(
        "flex flex-col min-h-0 h-full rounded-md border border-border bg-card/60",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
        <Database className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
          Memory State · cx_observational_memory
        </span>
        <button
          type="button"
          onClick={fetchRow}
          disabled={state.status === "loading"}
          className="flex items-center gap-1 h-6 px-1.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          {state.status === "loading" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Refresh
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {state.status === "idle" && (
          <EmptyHint>Click refresh to fetch the memory row.</EmptyHint>
        )}

        {state.status === "loading" && (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Querying cx_observational_memory…
          </div>
        )}

        {state.status === "error" && (
          <div className="text-xs bg-destructive/5 border border-destructive/20 text-destructive rounded p-2">
            {state.error}
          </div>
        )}

        {state.status === "success" && !state.row && (
          <EmptyHint>
            No memory row exists for this conversation yet. A row is created on
            the first memory-enabled turn.
          </EmptyHint>
        )}

        {state.status === "success" && state.row && (
          <MemoryRowDetails row={state.row} />
        )}
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
      <Info className="w-8 h-8 opacity-20" />
      <div className="text-xs text-center max-w-sm">{children}</div>
    </div>
  );
}

function MemoryRowDetails({ row }: { row: MemoryRow }) {
  return (
    <>
      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile
          label="Generation"
          value={String(row.generation_count)}
          tone="emerald"
        />
        <StatTile
          label="Observation tokens"
          value={formatTokens(row.observation_token_count)}
        />
        <StatTile
          label="Pending tokens"
          value={formatTokens(row.pending_message_tokens)}
        />
        <StatTile
          label="Reflected lines"
          value={formatTokens(row.reflected_observation_line_count)}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <KeyValue label="Scope" value={row.scope} mono />
        <KeyValue
          label="Last observed"
          value={
            row.last_observed_at
              ? `${formatRelativeTime(row.last_observed_at)} · ${formatDateTime(
                  row.last_observed_at,
                )}`
              : "—"
          }
        />
        <KeyValue
          label="Buffering observation"
          value={row.is_buffering_observation ? "yes" : "no"}
          tone={row.is_buffering_observation ? "emerald" : undefined}
        />
        <KeyValue
          label="Buffering reflection"
          value={row.is_buffering_reflection ? "yes" : "no"}
          tone={row.is_buffering_reflection ? "emerald" : undefined}
        />
        <KeyValue
          label="Updated"
          value={`${formatRelativeTime(row.updated_at)} · ${formatDateTime(row.updated_at)}`}
        />
        <KeyValue
          label="Created"
          value={`${formatRelativeTime(row.created_at)} · ${formatDateTime(row.created_at)}`}
        />
      </div>

      <TextPayload
        title="Active observations"
        subtitle="Injected into every turn's system prompt"
        icon={<FileText className="w-3.5 h-3.5" />}
        text={row.active_observations}
      />

      <TextPayload
        title="Current task"
        subtitle="Latest distilled task the user is working on"
        text={row.current_task}
      />

      <TextPayload
        title="Suggested response"
        subtitle="Observer's proposed next-turn nudge"
        text={row.suggested_response}
      />

      <TextPayload
        title="Buffered reflection"
        subtitle="Pending Reflector compression queued for the next run"
        text={row.buffered_reflection}
      />

      <JsonPayload
        title="Buffered observations"
        subtitle="Pending async observer chunks"
        value={row.buffered_observations}
      />

      <JsonPayload
        title="Observed message IDs"
        subtitle="Message IDs that have already fed into memory"
        value={row.observed_message_ids}
      />

      <JsonPayload
        title="Config"
        subtitle="Per-conversation memory config overrides"
        value={row.config}
      />

      <JsonPayload
        title="Metadata"
        subtitle="Free-form metadata on the memory row"
        value={row.metadata}
      />
    </>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div className="rounded border border-border/60 bg-muted/10 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 truncate">
        {label}
      </div>
      <div
        className={cn(
          "text-xs font-mono font-medium truncate",
          tone === "emerald" && "text-emerald-500",
          !tone && "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function KeyValue({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "emerald";
}) {
  return (
    <div className="flex gap-1.5 min-w-0">
      <span className="text-muted-foreground/80 shrink-0">{label}:</span>
      <span
        className={cn(
          "truncate",
          mono && "font-mono text-[11px]",
          tone === "emerald" && "text-emerald-500",
          !tone && "text-foreground",
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function TextPayload({
  title,
  subtitle,
  icon,
  text,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  text: string | null | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const hasText = typeof text === "string" && text.length > 0;

  const handleCopy = useCallback(() => {
    if (!hasText) return;
    navigator.clipboard.writeText(text!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text, hasText]);

  return (
    <div className="rounded border border-border/60 bg-background/50 overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/20 border-b border-border/60">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-foreground">
            {title}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {subtitle}
          </div>
        </div>
        {hasText && (
          <>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              {text!.length.toLocaleString()} chars
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
              title="Copy"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </>
        )}
      </div>
      {hasText ? (
        <pre className="p-2 text-[11px] font-mono text-foreground whitespace-pre-wrap break-words max-h-64 overflow-y-auto leading-relaxed">
          {text}
        </pre>
      ) : (
        <div className="p-2 text-[11px] text-muted-foreground italic">
          (empty)
        </div>
      )}
    </div>
  );
}

function JsonPayload({
  title,
  subtitle,
  value,
}: {
  title: string;
  subtitle: string;
  value: unknown;
}) {
  const serialized = React.useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  const isEmpty =
    value == null ||
    serialized === "null" ||
    serialized === "{}" ||
    serialized === "[]";

  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(serialized);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [serialized]);

  return (
    <div className="rounded border border-border/60 bg-background/50 overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/20 border-b border-border/60">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-foreground">
            {title}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {subtitle}
          </div>
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={handleCopy}
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            title="Copy"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}
      </div>
      {isEmpty ? (
        <div className="p-2 text-[11px] text-muted-foreground italic">
          (empty)
        </div>
      ) : (
        <pre className="p-2 text-[11px] font-mono text-foreground whitespace-pre-wrap break-words max-h-56 overflow-y-auto leading-relaxed">
          {serialized}
        </pre>
      )}
    </div>
  );
}
