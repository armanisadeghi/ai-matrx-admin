"use client";

import { useEffect, useMemo, useRef } from "react";
import { ListChecks, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { BlockRenderer } from "@/components/mardown-display/chat-markdown/block-registry/BlockRenderer";
import { COLUMN_IDS } from "../../constants";
import { runModulePassThunk } from "../../redux/runModulePass.thunk";
import type { ModuleSegment } from "../../types";
import { getModule } from "../../modules/registry";
import { useScrollSyncOptional } from "../scroll-sync/ScrollSyncProvider";
import { ColumnEmptyState } from "./ColumnEmptyState";
import { ColumnHeader } from "./ColumnHeader";
import { SegmentWrapper } from "./SegmentWrapper";

interface ModuleColumnProps {
  sessionId: string;
  className?: string;
}

export function ModuleColumn({ sessionId, className }: ModuleColumnProps) {
  // Active module id lives on the session row. Default is "tasks".
  const moduleId = useAppSelector(
    (state) => state.transcriptStudio.byId[sessionId]?.moduleId ?? "tasks",
  );
  const showPriorModules = useAppSelector(
    // Phase 8 will add the settings slice; until then default to false.
    () => false,
  );

  const ids = useAppSelector(
    (state) => state.transcriptStudio.moduleSegmentIdsBySession[sessionId],
  );
  const byId = useAppSelector(
    (state) => state.transcriptStudio.moduleSegmentsById[sessionId],
  );
  const segments = useMemo<ModuleSegment[]>(() => {
    if (!ids || !byId) return [];
    const out: ModuleSegment[] = [];
    for (const id of ids) {
      const seg = byId[id];
      if (!seg) continue;
      // Filter to the active module unless the session has chosen to show
      // prior module history.
      if (!showPriorModules && seg.moduleId !== moduleId) continue;
      out.push(seg);
    }
    return out;
  }, [ids, byId, moduleId, showPriorModules]);

  const moduleDef = useMemo(() => getModule(moduleId), [moduleId]);

  // Run audit, used for the dot + status string.
  const runIds = useAppSelector(
    (state) => state.transcriptStudio.runIdsBySession[sessionId],
  );
  const runsById = useAppSelector(
    (state) => state.transcriptStudio.runsById[sessionId],
  );
  const latestRun = useMemo(() => {
    if (!runIds || !runsById) return null;
    for (let i = runIds.length - 1; i >= 0; i--) {
      const r = runsById[runIds[i]!];
      if (r?.columnIdx === 4) return r;
    }
    return null;
  }, [runIds, runsById]);

  const isRunning = latestRun?.status === "running";
  const dotState =
    isRunning ? "running" : latestRun?.status === "failed" ? "error" : "idle";
  const status = useMemo(() => {
    const labelPrefix = moduleDef?.label ?? moduleId;
    if (segments.length === 0) {
      return isRunning ? `${labelPrefix} · running…` : labelPrefix;
    }
    return `${labelPrefix} · ${segments.length} pass${segments.length === 1 ? "" : "es"}${isRunning ? " · running" : ""}`;
  }, [segments, isRunning, moduleDef, moduleId]);

  // Sync-scroll registration.
  const sync = useScrollSyncOptional();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sync) return;
    sync.registerColumn(COLUMN_IDS.module, scrollRef.current);
    return () => sync.registerColumn(COLUMN_IDS.module, null);
  }, [sync]);
  const onPointerLead = sync
    ? () => sync.markLeader(COLUMN_IDS.module)
    : undefined;

  const dispatch = useAppDispatch();
  const handleManualRun = () => {
    if (isRunning) return;
    void dispatch(
      runModulePassThunk({ sessionId, triggerCause: "manual" }),
    );
  };
  const manualButton = (
    <button
      type="button"
      onClick={handleManualRun}
      disabled={isRunning}
      title={
        isRunning
          ? "A module pass is already running"
          : `Run ${moduleDef?.label ?? moduleId} now`
      }
      aria-label="Run module now"
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded transition-colors",
        isRunning
          ? "text-muted-foreground/50 cursor-not-allowed"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      <RefreshCw className={cn("h-3 w-3", isRunning && "animate-spin")} />
    </button>
  );

  const HeaderIcon = moduleDef?.icon ?? ListChecks;

  return (
    <section
      className={cn("flex h-full min-h-0 flex-col bg-background", className)}
      aria-label="Module"
    >
      <ColumnHeader
        icon={HeaderIcon}
        label="Module"
        status={status}
        dotState={dotState}
        actions={manualButton}
      />
      {!moduleDef ? (
        <ColumnEmptyState
          icon={ListChecks}
          title={`Unknown module "${moduleId}"`}
          description="Switch to a registered module via the settings sidebar."
        />
      ) : segments.length === 0 ? (
        <ColumnEmptyState
          icon={HeaderIcon}
          title={
            isRunning
              ? `Running ${moduleDef.label}…`
              : moduleDef.label
          }
          description={
            latestRun?.status === "failed"
              ? "Last run failed. Recording continues; the next tick retries."
              : moduleDef.description
          }
        />
      ) : (
        <div
          ref={scrollRef}
          onWheel={onPointerLead}
          onTouchStart={onPointerLead}
          onPointerDown={onPointerLead}
          className="flex-1 min-h-0 overflow-y-auto py-1.5"
        >
          {segments.map((seg) => (
            <ModuleSegmentRender key={seg.id} segment={seg} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Render one module segment. We delegate to the existing markdown-block
 * registry — `tasks` segments dispatch to `<TasksBlock content={payload} />`,
 * future modules dispatch to whatever `blockType` they declare.
 *
 * BlockRenderer expects content to be a string (Python's markdown body). For
 * modules whose payload is a string (tasks → markdown checklist), we pass it
 * straight through. For modules whose payload is structured JSON, we
 * stringify it — those blocks parse it back via `serverData` or similar.
 */
function ModuleSegmentRender({ segment }: { segment: ModuleSegment }) {
  const content =
    typeof segment.payload === "string"
      ? segment.payload
      : JSON.stringify(segment.payload);
  return (
    <SegmentWrapper
      column={COLUMN_IDS.module}
      tStart={segment.tStart ?? 0}
      tEnd={segment.tEnd ?? segment.tStart ?? 0}
      className="px-2"
    >
      <BlockRenderer
        block={{ type: segment.blockType, content }}
        index={segment.passIndex}
        replaceBlockContent={() => {
          // Module segments are agent-emitted, not user-edited. No-op.
        }}
        handleOpenEditor={() => {
          // No editor surface inside the studio column. No-op.
        }}
      />
    </SegmentWrapper>
  );
}
