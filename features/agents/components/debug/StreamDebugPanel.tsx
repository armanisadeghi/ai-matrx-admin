"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  AlertTriangle,
  CircleDot,
  FileText,
  Wrench,
  Database,
  Radio,
  Heart,
  Square,
  Layers,
  Activity,
  BarChart3,
} from "lucide-react";
import type {
  ActiveRequest,
  TimelineEntry,
  ClientMetrics,
  ToolLifecycleEntry,
} from "@/features/agents/types/request.types";
import type {
  StatusUpdatePayload,
  ContentBlockPayload,
  CompletionPayload,
} from "@/types/python-generated/stream-events";
import type { InstanceStatus } from "@/features/agents/types/instance.types";

// =============================================================================
// Utilities
// =============================================================================

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };
  return { copied, copy };
}

function CopyBtn({
  text,
  id,
  className,
}: {
  text: string;
  id: string;
  className?: string;
}) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        copy(text, id);
      }}
      className={cn(
        "p-0.5 text-muted-foreground hover:text-foreground transition-colors",
        className,
      )}
    >
      {copied === id ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function JsonView({
  data,
  label,
  id,
}: {
  data: unknown;
  label?: string;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(data, null, 2);
  if (data === null || data === undefined) return null;
  const isSimple =
    typeof data === "string" ||
    typeof data === "number" ||
    typeof data === "boolean";

  if (isSimple) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px]">
        {label && <span className="text-muted-foreground">{label}:</span>}
        <code className="text-foreground/80 bg-muted/50 px-1 rounded max-w-[300px] truncate inline-block">
          {String(data)}
        </code>
        <CopyBtn text={String(data)} id={id} />
      </span>
    );
  }

  return (
    <div className="text-[10px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
      >
        {open ? (
          <ChevronDown className="h-2.5 w-2.5" />
        ) : (
          <ChevronRight className="h-2.5 w-2.5" />
        )}
        {label && <span>{label}</span>}
        {!open && (
          <span className="text-muted-foreground/60 ml-1">
            {json.length > 100 ? `${json.length} chars` : json.slice(0, 60)}
          </span>
        )}
      </button>
      {open && (
        <div className="relative mt-0.5 ml-2">
          <CopyBtn text={json} id={id} className="absolute top-0 right-0" />
          <pre className="bg-muted/30 border border-border/50 rounded p-1 text-[9px] overflow-x-auto whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto font-mono">
            {json}
          </pre>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Event type styling
// =============================================================================

const EVENT_COLORS: Record<string, string> = {
  chunk: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  status_update: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  data: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  completion: "bg-green-500/20 text-green-400 border-green-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  tool_event: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  broker: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  heartbeat: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  end: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  content_block: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  chunk: <FileText className="h-2.5 w-2.5" />,
  status_update: <Activity className="h-2.5 w-2.5" />,
  data: <Database className="h-2.5 w-2.5" />,
  completion: <BarChart3 className="h-2.5 w-2.5" />,
  error: <AlertTriangle className="h-2.5 w-2.5" />,
  tool_event: <Wrench className="h-2.5 w-2.5" />,
  broker: <Radio className="h-2.5 w-2.5" />,
  heartbeat: <Heart className="h-2.5 w-2.5" />,
  end: <Square className="h-2.5 w-2.5" />,
  content_block: <Layers className="h-2.5 w-2.5" />,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-500/20 text-gray-400",
  connecting: "bg-yellow-500/20 text-yellow-400",
  streaming: "bg-blue-500/20 text-blue-400",
  "awaiting-tools": "bg-orange-500/20 text-orange-400",
  complete: "bg-green-500/20 text-green-400",
  error: "bg-red-500/20 text-red-400",
  timeout: "bg-red-500/20 text-red-400",
};

const INSTANCE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  ready: "bg-cyan-500/20 text-cyan-400",
  running: "bg-yellow-500/20 text-yellow-400",
  streaming: "bg-blue-500/20 text-blue-400",
  paused: "bg-orange-500/20 text-orange-400",
  complete: "bg-green-500/20 text-green-400",
  error: "bg-red-500/20 text-red-400",
};

// =============================================================================
// Sub-components
// =============================================================================

function StatusBar({
  request,
  instanceStatus,
}: {
  request: ActiveRequest;
  instanceStatus?: InstanceStatus;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap px-1.5 py-1 border-b border-border/50 bg-muted/20">
      <span className="text-[9px] text-muted-foreground font-mono">REQ</span>
      <Badge
        variant="outline"
        className={cn(
          "text-[9px] px-1 py-0 h-4 font-mono",
          STATUS_COLORS[request.status] ?? "",
        )}
      >
        {request.status}
      </Badge>
      {instanceStatus && (
        <>
          <span className="text-[9px] text-muted-foreground font-mono">
            INST
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1 py-0 h-4 font-mono",
              INSTANCE_STATUS_COLORS[instanceStatus] ?? "",
            )}
          >
            {instanceStatus}
          </Badge>
        </>
      )}
      {request.currentStatus && (
        <>
          <span className="text-[9px] text-muted-foreground">|</span>
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-4 bg-yellow-500/10 text-yellow-400"
          >
            {request.currentStatus.user_message ?? request.currentStatus.status}
          </Badge>
        </>
      )}
      {request.errorMessage && (
        <>
          <span className="text-[9px] text-muted-foreground">|</span>
          <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
            {request.errorIsFatal ? "FATAL" : "ERR"}:{" "}
            {request.errorMessage.slice(0, 60)}
          </Badge>
        </>
      )}
      {request.conversationId && (
        <span className="text-[9px] text-muted-foreground font-mono ml-auto flex items-center gap-0.5">
          conv: {request.conversationId.slice(0, 8)}...
          <CopyBtn text={request.conversationId} id="conv-id" />
        </span>
      )}
    </div>
  );
}

function MetricsBar({ metrics }: { metrics: ClientMetrics }) {
  return (
    <div className="flex items-center gap-2 flex-wrap px-1.5 py-0.5 border-b border-border/50 bg-muted/10 text-[9px]">
      <span className="flex items-center gap-0.5 text-muted-foreground">
        <Clock className="h-2.5 w-2.5" /> TTFT:
      </span>
      <span className="font-mono text-foreground/80">
        {metrics.ttftMs !== null ? `${metrics.ttftMs.toFixed(0)}ms` : "—"}
      </span>
      <span className="text-muted-foreground/40">|</span>
      <span className="text-muted-foreground">Stream:</span>
      <span className="font-mono text-foreground/80">
        {metrics.streamDurationMs !== null
          ? `${(metrics.streamDurationMs / 1000).toFixed(2)}s`
          : "—"}
      </span>
      <span className="text-muted-foreground/40">|</span>
      <span className="text-muted-foreground">Total:</span>
      <span className="font-mono text-foreground/80">
        {metrics.totalClientDurationMs !== null
          ? `${(metrics.totalClientDurationMs / 1000).toFixed(2)}s`
          : "—"}
      </span>
      <span className="text-muted-foreground/40">|</span>
      <span className="text-muted-foreground">Events:</span>
      <span className="font-mono text-foreground/80">
        {metrics.totalEvents}
      </span>
      <span className="text-[8px] text-muted-foreground/60">
        (chunk:{metrics.chunkEvents} status:{metrics.statusUpdateEvents} tool:
        {metrics.toolEvents} data:{metrics.dataEvents} block:
        {metrics.contentBlockEvents} other:{metrics.otherEvents})
      </span>
    </div>
  );
}

function getTimelineColor(kind: TimelineEntry["kind"]): string {
  const map: Record<string, string> = {
    text_start: EVENT_COLORS.chunk,
    text_end: EVENT_COLORS.chunk,
    status_update: EVENT_COLORS.status_update,
    tool_event: EVENT_COLORS.tool_event,
    content_block: EVENT_COLORS.content_block,
    data: EVENT_COLORS.data,
    completion: EVENT_COLORS.completion,
    error: EVENT_COLORS.error,
    end: EVENT_COLORS.end,
    broker: EVENT_COLORS.broker,
    heartbeat: EVENT_COLORS.heartbeat,
  };
  return map[kind] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

function getTimelineIcon(kind: TimelineEntry["kind"]): React.ReactNode {
  const map: Record<string, React.ReactNode> = {
    text_start: EVENT_ICONS.chunk,
    text_end: EVENT_ICONS.chunk,
    status_update: EVENT_ICONS.status_update,
    tool_event: EVENT_ICONS.tool_event,
    content_block: EVENT_ICONS.content_block,
    data: EVENT_ICONS.data,
    completion: EVENT_ICONS.completion,
    error: EVENT_ICONS.error,
    end: EVENT_ICONS.end,
    broker: EVENT_ICONS.broker,
    heartbeat: EVENT_ICONS.heartbeat,
  };
  return map[kind] ?? <CircleDot className="h-2.5 w-2.5" />;
}

function timelineSummary(entry: TimelineEntry, textChunks: string[]): string {
  switch (entry.kind) {
    case "text_start":
      return `text streaming started (chunk idx ${entry.chunkStartIndex})`;
    case "text_end": {
      const slice = textChunks
        .slice(entry.chunkStartIndex, entry.chunkEndIndex)
        .join("");
      const preview = slice.length > 80 ? slice.slice(0, 80) + "..." : slice;
      return `${entry.chunkCount} chunks: "${preview}"`;
    }
    case "status_update":
      return entry.data.user_message ?? entry.data.status;
    case "tool_event":
      return `${entry.subEvent} — ${entry.toolName} (${entry.callId.slice(0, 8)})`;
    case "content_block":
      return `${entry.blockType} [${entry.blockStatus}] ${entry.blockId.slice(0, 8)}`;
    case "data":
      return JSON.stringify(entry.data).slice(0, 80);
    case "completion":
      return "stream completed";
    case "error":
      return `${entry.isFatal ? "FATAL" : "ERR"}: ${entry.message.slice(0, 80)}`;
    case "end":
      return entry.reason ?? "stream ended";
    case "broker":
      return `broker: ${entry.brokerId}`;
    case "heartbeat":
      return "heartbeat";
    default:
      return "";
  }
}

function TimelineRow({
  entry,
  baseTime,
  textChunks,
}: {
  entry: TimelineEntry;
  baseTime: number;
  textChunks: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const relativeMs = entry.timestamp - baseTime;
  const colorClass = getTimelineColor(entry.kind);
  const icon = getTimelineIcon(entry.kind);
  const json = JSON.stringify(entry, null, 2);
  const summary = timelineSummary(entry, textChunks);

  return (
    <div
      className={cn(
        "border-b border-border/20 hover:bg-muted/20 transition-colors",
        expanded && "bg-muted/10",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1 px-1.5 py-0.5 text-left cursor-pointer"
      >
        <span className="text-[9px] font-mono text-muted-foreground/60 w-6 shrink-0 text-right">
          {entry.seq}
        </span>
        <span className="text-[9px] font-mono text-muted-foreground/80 w-16 shrink-0 text-right">
          {relativeMs.toFixed(0)}ms
        </span>
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] px-1 py-0 h-4 gap-0.5 shrink-0 border",
            colorClass,
          )}
        >
          {icon}
          {entry.kind}
        </Badge>
        {entry.kind === "tool_event" && (
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1 py-0 h-4 shrink-0 border",
              colorClass,
            )}
          >
            {entry.subEvent}
          </Badge>
        )}
        <span className="flex-1 text-[9px] text-muted-foreground/60 truncate font-mono">
          {summary}
        </span>
        <CopyBtn text={json} id={`tl-${entry.seq}`} />
        {expanded ? (
          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-1.5 pb-1 ml-[90px]">
          {entry.kind === "text_end" && (
            <div className="mb-1">
              <pre className="text-[9px] font-mono bg-muted/30 border border-border/50 rounded p-1 whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
                {textChunks
                  .slice(entry.chunkStartIndex, entry.chunkEndIndex)
                  .join("")}
              </pre>
              <CopyBtn
                text={textChunks
                  .slice(entry.chunkStartIndex, entry.chunkEndIndex)
                  .join("")}
                id={`tl-text-${entry.seq}`}
              />
            </div>
          )}
          <JsonView data={entry} id={`tl-data-${entry.seq}`} />
        </div>
      )}
    </div>
  );
}

function ToolLifecycleRow({ tool }: { tool: ToolLifecycleEntry }) {
  const statusColor: Record<string, string> = {
    started: "bg-yellow-500/20 text-yellow-400",
    progress: "bg-blue-500/20 text-blue-400",
    step: "bg-cyan-500/20 text-cyan-400",
    result_preview: "bg-purple-500/20 text-purple-400",
    completed: "bg-green-500/20 text-green-400",
    error: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="border-b border-border/20 px-1.5 py-0.5">
      <div className="flex items-center gap-1 flex-wrap">
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] px-1 py-0 h-4",
            statusColor[tool.status] ?? "",
          )}
        >
          {tool.status}
        </Badge>
        <span className="text-[10px] font-medium text-foreground/80">
          {tool.toolName}
        </span>
        <span className="text-[8px] font-mono text-muted-foreground/60">
          {tool.callId.slice(0, 12)}
        </span>
        {tool.isDelegated && (
          <Badge
            variant="outline"
            className="text-[8px] px-0.5 py-0 h-3 bg-orange-500/10 text-orange-400"
          >
            delegated
          </Badge>
        )}
        <CopyBtn
          text={JSON.stringify(tool, null, 2)}
          id={`tool-${tool.callId}`}
          className="ml-auto"
        />
      </div>
      {tool.latestMessage && (
        <p className="text-[9px] text-muted-foreground ml-2 mt-0.5">
          {tool.latestMessage}
        </p>
      )}
      {tool.arguments && Object.keys(tool.arguments).length > 0 && (
        <JsonView
          data={tool.arguments}
          label="args"
          id={`tool-args-${tool.callId}`}
        />
      )}
      {tool.result !== null && (
        <JsonView
          data={tool.result}
          label="result"
          id={`tool-result-${tool.callId}`}
        />
      )}
      {tool.resultPreview && (
        <div className="text-[9px] text-muted-foreground ml-2">
          Preview: {tool.resultPreview}
        </div>
      )}
      {tool.errorMessage && (
        <div className="text-[9px] text-red-400 ml-2">
          {tool.errorType}: {tool.errorMessage}
        </div>
      )}
    </div>
  );
}

function ContentBlockRow({ block }: { block: ContentBlockPayload }) {
  const statusColor: Record<string, string> = {
    streaming: "bg-blue-500/20 text-blue-400",
    complete: "bg-green-500/20 text-green-400",
    error: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="border-b border-border/20 px-1.5 py-0.5">
      <div className="flex items-center gap-1">
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] px-1 py-0 h-4",
            statusColor[block.status] ?? "",
          )}
        >
          {block.status}
        </Badge>
        <span className="text-[10px] font-medium text-foreground/80">
          {block.type}
        </span>
        <span className="text-[8px] font-mono text-muted-foreground/60">
          #{block.blockIndex} {block.blockId.slice(0, 12)}
        </span>
        <CopyBtn
          text={JSON.stringify(block, null, 2)}
          id={`block-${block.blockId}`}
          className="ml-auto"
        />
      </div>
      {block.content && (
        <pre className="text-[9px] text-muted-foreground ml-2 mt-0.5 whitespace-pre-wrap break-all max-h-[100px] overflow-y-auto font-mono">
          {block.content}
        </pre>
      )}
      {block.data && (
        <JsonView
          data={block.data}
          label="data"
          id={`block-data-${block.blockId}`}
        />
      )}
      {block.metadata && (
        <JsonView
          data={block.metadata}
          label="meta"
          id={`block-meta-${block.blockId}`}
        />
      )}
    </div>
  );
}

function StatusHistoryRow({
  entry,
  idx,
}: {
  entry: StatusUpdatePayload;
  idx: number;
}) {
  return (
    <div className="border-b border-border/20 px-1.5 py-0.5 flex items-center gap-1">
      <span className="text-[9px] font-mono text-muted-foreground/60 w-4 text-right">
        {idx + 1}
      </span>
      <Badge
        variant="outline"
        className="text-[9px] px-1 py-0 h-4 bg-yellow-500/10 text-yellow-400"
      >
        {entry.status}
      </Badge>
      {entry.user_message && (
        <span className="text-[9px] text-foreground/70">
          {entry.user_message}
        </span>
      )}
      {entry.system_message && (
        <span className="text-[9px] text-muted-foreground italic">
          {entry.system_message}
        </span>
      )}
      <CopyBtn
        text={JSON.stringify(entry, null, 2)}
        id={`status-${idx}`}
        className="ml-auto"
      />
    </div>
  );
}

// =============================================================================
// Filter Bar
// =============================================================================

const ALL_TIMELINE_KINDS: TimelineEntry["kind"][] = [
  "text_start",
  "text_end",
  "status_update",
  "tool_event",
  "content_block",
  "data",
  "completion",
  "error",
  "end",
  "broker",
  "heartbeat",
];

function TimelineFilterBar({
  activeFilters,
  onToggle,
  counts,
}: {
  activeFilters: Set<string>;
  onToggle: (kind: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="flex items-center gap-0.5 flex-wrap px-1.5 py-0.5 border-b border-border/50">
      <Filter className="h-3 w-3 text-muted-foreground mr-0.5" />
      {ALL_TIMELINE_KINDS.map((kind) => {
        const active = activeFilters.has(kind);
        const count = counts[kind] ?? 0;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onToggle(kind)}
            className={cn(
              "inline-flex items-center gap-0.5 text-[9px] px-1 py-0 h-4 rounded border transition-colors",
              active
                ? getTimelineColor(kind)
                : "bg-muted/20 text-muted-foreground/40 border-transparent hover:border-border/50",
            )}
          >
            {getTimelineIcon(kind)}
            {kind.replace("_", " ")}
            {count > 0 && <span className="font-mono ml-0.5">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Tab Content Components
// =============================================================================

function TimelineTab({ request }: { request: ActiveRequest }) {
  const [filters, setFilters] = useState<Set<string>>(
    new Set(ALL_TIMELINE_KINDS),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevLengthRef = useRef(0);

  const counts: Record<string, number> = {};
  for (const entry of request.timeline) {
    counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
  }

  const filtered = request.timeline.filter((e) => filters.has(e.kind));
  const baseTime =
    request.timeline.length > 0 ? request.timeline[0].timestamp : 0;

  const toggleFilter = (kind: string) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  useEffect(() => {
    if (
      autoScroll &&
      filtered.length > prevLengthRef.current &&
      scrollRef.current
    ) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLengthRef.current = filtered.length;
  }, [filtered.length, autoScroll]);

  return (
    <div className="flex flex-col h-full">
      <TimelineFilterBar
        activeFilters={filters}
        onToggle={toggleFilter}
        counts={counts}
      />
      <div className="flex items-center gap-1 px-1.5 py-0.5 border-b border-border/30 text-[9px] text-muted-foreground">
        <span>
          {filtered.length} of {request.timeline.length} entries
        </span>
        {request.isTextStreaming && (
          <Badge
            variant="outline"
            className="text-[8px] px-1 py-0 h-3 bg-blue-500/10 text-blue-400 animate-pulse"
          >
            STREAMING TEXT
          </Badge>
        )}
        <button
          type="button"
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            "ml-auto px-1 py-0 h-4 rounded text-[9px] border",
            autoScroll
              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
              : "bg-muted/20 text-muted-foreground border-transparent",
          )}
        >
          auto-scroll {autoScroll ? "ON" : "OFF"}
        </button>
        <CopyBtn
          text={JSON.stringify(request.timeline, null, 2)}
          id="all-timeline"
        />
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
      >
        {filtered.map((entry) => (
          <TimelineRow
            key={entry.seq}
            entry={entry}
            baseTime={baseTime}
            textChunks={request.textChunks}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-[10px] text-muted-foreground/60 text-center py-4">
            {request.timeline.length === 0
              ? "No events yet — waiting for stream..."
              : "No entries match current filters"}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolsTab({ request }: { request: ActiveRequest }) {
  const tools = Object.values(request.toolLifecycle);
  return (
    <ScrollArea className="h-full">
      {tools.length === 0 && (
        <div className="text-[10px] text-muted-foreground/60 text-center py-4">
          No tool events
        </div>
      )}
      {tools.map((tool) => (
        <ToolLifecycleRow key={tool.callId} tool={tool} />
      ))}
      {request.pendingToolCalls.length > 0 && (
        <div className="px-1.5 py-1 border-t border-border/30">
          <span className="text-[9px] text-muted-foreground font-medium">
            Pending Tool Calls ({request.pendingToolCalls.length})
          </span>
          {request.pendingToolCalls.map((tc) => (
            <div
              key={tc.callId}
              className="flex items-center gap-1 ml-2 text-[9px]"
            >
              <Badge
                variant="outline"
                className={cn(
                  "text-[8px] px-0.5 py-0 h-3",
                  tc.resolved
                    ? "bg-green-500/10 text-green-400"
                    : "bg-orange-500/10 text-orange-400",
                )}
              >
                {tc.resolved ? "resolved" : "pending"}
              </Badge>
              <span className="font-mono text-muted-foreground/60">
                {tc.callId.slice(0, 12)}
              </span>
              <span className="text-foreground/80">{tc.toolName}</span>
              <CopyBtn
                text={JSON.stringify(tc, null, 2)}
                id={`ptc-${tc.callId}`}
              />
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

function StatusTab({ request }: { request: ActiveRequest }) {
  return (
    <ScrollArea className="h-full">
      <div className="px-1.5 py-1 border-b border-border/30">
        <span className="text-[9px] text-muted-foreground font-medium">
          Current Status
        </span>
        {request.currentStatus ? (
          <div className="ml-2">
            <JsonView data={request.currentStatus} id="cur-status" />
          </div>
        ) : (
          <div className="text-[9px] text-muted-foreground/50 ml-2">
            No status updates received
          </div>
        )}
      </div>
      <div className="px-1.5 py-0.5">
        <span className="text-[9px] text-muted-foreground font-medium">
          History ({request.statusHistory.length})
        </span>
      </div>
      {request.statusHistory.length === 0 && (
        <div className="text-[10px] text-muted-foreground/60 text-center py-4">
          No status updates
        </div>
      )}
      {request.statusHistory.map((entry, idx) => (
        <StatusHistoryRow key={idx} entry={entry} idx={idx} />
      ))}
    </ScrollArea>
  );
}

function BlocksTab({ request }: { request: ActiveRequest }) {
  const blocks = request.contentBlockOrder
    .map((id) => request.contentBlocks[id])
    .filter(Boolean) as ContentBlockPayload[];
  return (
    <ScrollArea className="h-full">
      {blocks.length === 0 && (
        <div className="text-[10px] text-muted-foreground/60 text-center py-4">
          No content blocks
        </div>
      )}
      {blocks.map((block) => (
        <ContentBlockRow key={block.blockId} block={block} />
      ))}
    </ScrollArea>
  );
}

function TextTab({ request }: { request: ActiveRequest }) {
  const text =
    request.textChunks.length > 0
      ? request.textChunks.join("")
      : request.accumulatedText;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-1.5 py-0.5 border-b border-border/30 text-[9px] text-muted-foreground">
        <span>{request.textChunks.length} chunks</span>
        <span className="text-muted-foreground/40">|</span>
        <span>{new TextEncoder().encode(text).length} bytes</span>
        <CopyBtn text={text} id="full-text" className="ml-auto" />
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <pre className="text-[10px] font-mono whitespace-pre-wrap break-all p-1.5 text-foreground/80">
          {text || (
            <span className="text-muted-foreground/40 italic">
              No text yet...
            </span>
          )}
        </pre>
      </ScrollArea>
    </div>
  );
}

function DataTab({ request }: { request: ActiveRequest }) {
  return (
    <ScrollArea className="h-full">
      <div className="px-1.5 py-0.5 border-b border-border/30 text-[9px] text-muted-foreground">
        {request.dataPayloads.length} data payloads
        <CopyBtn
          text={JSON.stringify(request.dataPayloads, null, 2)}
          id="all-data"
          className="ml-1"
        />
      </div>
      {request.dataPayloads.length === 0 && (
        <div className="text-[10px] text-muted-foreground/60 text-center py-4">
          No data events
        </div>
      )}
      {request.dataPayloads.map((payload, idx) => (
        <div key={idx} className="border-b border-border/20 px-1.5 py-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono text-muted-foreground/60">
              {idx + 1}
            </span>
            <CopyBtn
              text={JSON.stringify(payload, null, 2)}
              id={`data-${idx}`}
            />
          </div>
          <JsonView data={payload} id={`data-body-${idx}`} />
        </div>
      ))}
    </ScrollArea>
  );
}

function CompletionTab({ request }: { request: ActiveRequest }) {
  return (
    <ScrollArea className="h-full">
      {request.completion ? (
        <div className="p-1.5">
          <JsonView
            data={request.completion}
            label="Completion"
            id="completion"
          />
        </div>
      ) : (
        <div className="text-[10px] text-muted-foreground/60 text-center py-4">
          No completion event received
        </div>
      )}
      {request.clientMetrics && (
        <div className="p-1.5 border-t border-border/30">
          <span className="text-[9px] text-muted-foreground font-medium">
            Client Metrics
          </span>
          <JsonView data={request.clientMetrics} id="client-metrics" />
        </div>
      )}
      {request.warnings.length > 0 && (
        <div className="p-1.5 border-t border-border/30">
          <span className="text-[9px] text-muted-foreground font-medium">
            Warnings ({request.warnings.length})
          </span>
          <JsonView data={request.warnings} id="warnings" />
        </div>
      )}
    </ScrollArea>
  );
}

function StateSnapshotTab({
  request,
  instanceStatus,
}: {
  request: ActiveRequest;
  instanceStatus?: InstanceStatus;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="p-1.5 space-y-1">
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-muted-foreground font-medium w-24 shrink-0">
            requestId:
          </span>
          <code className="font-mono text-foreground/80">
            {request.requestId}
          </code>
          <CopyBtn text={request.requestId} id="req-id" />
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-muted-foreground font-medium w-24 shrink-0">
            instanceId:
          </span>
          <code className="font-mono text-foreground/80">
            {request.instanceId}
          </code>
          <CopyBtn text={request.instanceId} id="inst-id" />
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-muted-foreground font-medium w-24 shrink-0">
            conversationId:
          </span>
          <code className="font-mono text-foreground/80">
            {request.conversationId ?? "null"}
          </code>
          {request.conversationId && (
            <CopyBtn text={request.conversationId} id="conv-id-snap" />
          )}
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-muted-foreground font-medium w-24 shrink-0">
            request.status:
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1 py-0 h-4",
              STATUS_COLORS[request.status] ?? "",
            )}
          >
            {request.status}
          </Badge>
        </div>
        {instanceStatus && (
          <div className="flex items-center gap-1 text-[9px]">
            <span className="text-muted-foreground font-medium w-24 shrink-0">
              instance.status:
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] px-1 py-0 h-4",
                INSTANCE_STATUS_COLORS[instanceStatus] ?? "",
              )}
            >
              {instanceStatus}
            </Badge>
          </div>
        )}
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-muted-foreground font-medium w-24 shrink-0">
            errorIsFatal:
          </span>
          <code className="font-mono text-foreground/80">
            {String(request.errorIsFatal)}
          </code>
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-muted-foreground font-medium w-24 shrink-0">
            startedAt:
          </span>
          <code className="font-mono text-foreground/80">
            {request.startedAt}
          </code>
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-muted-foreground font-medium w-24 shrink-0">
            firstChunkAt:
          </span>
          <code className="font-mono text-foreground/80">
            {request.firstChunkAt ?? "null"}
          </code>
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-muted-foreground font-medium w-24 shrink-0">
            completedAt:
          </span>
          <code className="font-mono text-foreground/80">
            {request.completedAt ?? "null"}
          </code>
        </div>

        <div className="border-t border-border/30 pt-1 mt-1">
          <span className="text-[9px] text-muted-foreground font-medium">
            Counts
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 ml-2 text-[9px] mt-0.5">
            <span className="text-muted-foreground">textChunks:</span>
            <span className="font-mono">{request.textChunks.length}</span>
            <span className="text-muted-foreground">statusHistory:</span>
            <span className="font-mono">{request.statusHistory.length}</span>
            <span className="text-muted-foreground">contentBlocks:</span>
            <span className="font-mono">
              {request.contentBlockOrder.length}
            </span>
            <span className="text-muted-foreground">toolLifecycle:</span>
            <span className="font-mono">
              {Object.keys(request.toolLifecycle).length}
            </span>
            <span className="text-muted-foreground">pendingToolCalls:</span>
            <span className="font-mono">{request.pendingToolCalls.length}</span>
            <span className="text-muted-foreground">dataPayloads:</span>
            <span className="font-mono">{request.dataPayloads.length}</span>
            <span className="text-muted-foreground">timeline:</span>
            <span className="font-mono">{request.timeline.length}</span>
            <span className="text-muted-foreground">warnings:</span>
            <span className="font-mono">{request.warnings.length}</span>
          </div>
        </div>

        <div className="border-t border-border/30 pt-1 mt-1">
          <span className="text-[9px] text-muted-foreground font-medium">
            Full State Dump
          </span>
          <CopyBtn
            text={JSON.stringify(request, null, 2)}
            id="full-dump"
            className="ml-1"
          />
          <JsonView data={request} label="ActiveRequest" id="full-state" />
        </div>
      </div>
    </ScrollArea>
  );
}

// =============================================================================
// Tab definitions
// =============================================================================

type TabId =
  | "events"
  | "tools"
  | "status"
  | "blocks"
  | "text"
  | "data"
  | "completion"
  | "state";

const TAB_DEFS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "events", label: "Timeline", icon: <Zap className="h-3 w-3" /> },
  { id: "text", label: "Text", icon: <FileText className="h-3 w-3" /> },
  { id: "tools", label: "Tools", icon: <Wrench className="h-3 w-3" /> },
  { id: "status", label: "Status", icon: <Activity className="h-3 w-3" /> },
  { id: "blocks", label: "Blocks", icon: <Layers className="h-3 w-3" /> },
  { id: "data", label: "Data", icon: <Database className="h-3 w-3" /> },
  { id: "completion", label: "Stats", icon: <BarChart3 className="h-3 w-3" /> },
  { id: "state", label: "State", icon: <CircleDot className="h-3 w-3" /> },
];

// =============================================================================
// Main Component
// =============================================================================

export interface StreamDebugPanelProps {
  instanceId: string;
  className?: string;
}

export function StreamDebugPanel({
  instanceId,
  className,
}: StreamDebugPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("events");

  const instanceStatus = useAppSelector(
    (state) => state.executionInstances.byInstanceId[instanceId]?.status,
  );

  const requestIds = useAppSelector(
    (state) => state.activeRequests.byInstanceId[instanceId] ?? [],
  );

  const [selectedRequestIdx, setSelectedRequestIdx] = useState<number>(-1);
  const effectiveIdx =
    selectedRequestIdx === -1 ? requestIds.length - 1 : selectedRequestIdx;
  const selectedRequestId = requestIds[effectiveIdx];

  const request = useAppSelector((state) =>
    selectedRequestId
      ? state.activeRequests.byRequestId[selectedRequestId]
      : undefined,
  );

  if (!request) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-[10px] text-muted-foreground/60",
          className,
        )}
      >
        No active request for this instance. Run the agent to begin debugging.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background text-foreground",
        className,
      )}
    >
      <StatusBar request={request} instanceStatus={instanceStatus} />
      {request.clientMetrics && <MetricsBar metrics={request.clientMetrics} />}

      {requestIds.length > 1 && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 border-b border-border/30 text-[9px]">
          <span className="text-muted-foreground">Request:</span>
          {requestIds.map((id, idx) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedRequestIdx(idx)}
              className={cn(
                "px-1.5 py-0 h-4 rounded border text-[9px] font-mono",
                idx === effectiveIdx
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-muted/20 text-muted-foreground border-transparent hover:border-border/50",
              )}
            >
              #{idx + 1}
            </button>
          ))}
        </div>
      )}

      <div className="flex border-b border-border/50 bg-muted/10 overflow-x-auto scrollbar-none">
        {TAB_DEFS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "inline-flex items-center gap-0.5 px-2 py-1 text-[10px] whitespace-nowrap border-b-2 transition-colors cursor-pointer",
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "events" && <TimelineTab request={request} />}
        {activeTab === "text" && <TextTab request={request} />}
        {activeTab === "tools" && <ToolsTab request={request} />}
        {activeTab === "status" && <StatusTab request={request} />}
        {activeTab === "blocks" && <BlocksTab request={request} />}
        {activeTab === "data" && <DataTab request={request} />}
        {activeTab === "completion" && <CompletionTab request={request} />}
        {activeTab === "state" && (
          <StateSnapshotTab request={request} instanceStatus={instanceStatus} />
        )}
      </div>
    </div>
  );
}

export default StreamDebugPanel;
