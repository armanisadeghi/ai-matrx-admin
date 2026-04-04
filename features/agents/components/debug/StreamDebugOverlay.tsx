"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import FullScreenOverlay from "@/components/official/FullScreenOverlay";
import { StreamDebugPanel } from "./StreamDebugPanel";
import type { ActiveRequest } from "@/features/agents/types/request.types";
import type { InstanceStatus } from "@/features/agents/types/instance.types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StreamDebugOverlayProps {
  instanceId: string;
  isOpen: boolean;
  onClose: () => void;
}

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

function OverlaySharedHeader({
  request,
  instanceStatus,
  requestIds,
  selectedIdx,
  onSelectRequest,
}: {
  request: ActiveRequest;
  instanceStatus?: InstanceStatus;
  requestIds: string[];
  selectedIdx: number;
  onSelectRequest: (idx: number) => void;
}) {
  return (
    <div className="space-y-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono">REQ</span>
        <Badge
          variant="outline"
          className={cn(
            "text-xs px-2 py-0.5 h-6 font-mono",
            STATUS_COLORS[request.status] ?? "",
          )}
        >
          {request.status}
        </Badge>
        {instanceStatus && (
          <>
            <span className="text-xs text-muted-foreground font-mono">
              INST
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-2 py-0.5 h-6 font-mono",
                INSTANCE_STATUS_COLORS[instanceStatus] ?? "",
              )}
            >
              {instanceStatus}
            </Badge>
          </>
        )}
        {request.currentStatus && (
          <>
            <span className="text-xs text-muted-foreground">|</span>
            <Badge
              variant="outline"
              className="text-xs px-2 py-0.5 h-6 bg-yellow-500/10 text-yellow-400"
            >
              {request.currentStatus.user_message ??
                request.currentStatus.status}
            </Badge>
          </>
        )}
        {request.errorMessage && (
          <>
            <span className="text-xs text-muted-foreground">|</span>
            <Badge variant="destructive" className="text-xs px-2 py-0.5 h-6">
              {request.errorIsFatal ? "FATAL" : "ERR"}:{" "}
              {request.errorMessage.slice(0, 80)}
            </Badge>
          </>
        )}
        {request.conversationId && (
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            conv: {request.conversationId.slice(0, 12)}...
          </span>
        )}
      </div>

      {request.clientMetrics && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-1">
          <span>
            TTFT:{" "}
            <span className="font-mono text-foreground/80">
              {request.clientMetrics.ttftMs?.toFixed(0) ?? "—"}ms
            </span>
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span>
            Stream:{" "}
            <span className="font-mono text-foreground/80">
              {request.clientMetrics.streamDurationMs != null
                ? `${(request.clientMetrics.streamDurationMs / 1000).toFixed(2)}s`
                : "—"}
            </span>
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span>
            Events:{" "}
            <span className="font-mono text-foreground/80">
              {request.clientMetrics.totalEvents}
            </span>
          </span>
        </div>
      )}

      {requestIds.length > 1 && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs">
          <span className="text-muted-foreground font-medium">Request:</span>
          {requestIds.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectRequest(idx)}
              className={cn(
                "px-2 py-0.5 h-6 rounded border text-xs font-mono",
                idx === selectedIdx
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-muted/20 text-muted-foreground border-transparent hover:border-border/50",
              )}
            >
              #{idx + 1}
            </button>
          ))}
          <span className="text-muted-foreground/60 ml-auto">
            {requestIds.length} total
          </span>
        </div>
      )}
    </div>
  );
}

export function StreamDebugOverlay({
  instanceId,
  isOpen,
  onClose,
}: StreamDebugOverlayProps) {
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
      <FullScreenOverlay
        isOpen={isOpen}
        onClose={onClose}
        title="Stream Debug"
        tabs={[
          {
            id: "empty",
            label: "Inspector",
            content: (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground/60">
                No active request. Run the agent to begin debugging.
              </div>
            ),
          },
        ]}
        hideTitle
        width="95vw"
        height="95dvh"
      />
    );
  }

  const sharedHeader = (
    <OverlaySharedHeader
      request={request}
      instanceStatus={instanceStatus}
      requestIds={requestIds}
      selectedIdx={effectiveIdx}
      onSelectRequest={setSelectedRequestIdx}
    />
  );

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="Stream Debug"
      sharedHeader={sharedHeader}
      sharedHeaderClassName="py-1.5 px-3"
      tabs={[
        {
          id: "timeline",
          label: "Timeline",
          content: (
            <StreamDebugPanel
              instanceId={instanceId}
              className="h-full"
              hideChrome
              requestIdOverride={selectedRequestId}
            />
          ),
        },
        {
          id: "full",
          label: "Full Inspector",
          content: (
            <StreamDebugPanel
              instanceId={instanceId}
              className="h-full"
              requestIdOverride={selectedRequestId}
            />
          ),
        },
      ]}
      hideTitle
      width="95vw"
      height="95dvh"
    />
  );
}

export default StreamDebugOverlay;
