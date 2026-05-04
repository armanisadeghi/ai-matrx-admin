"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import type { Layout } from "react-resizable-panels";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { ResizablePanel } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import {
  fetchCleanedSegmentsThunk,
  fetchConceptItemsThunk,
  fetchModuleSegmentsThunk,
  fetchRawSegmentsThunk,
} from "../redux/thunks";
import type { StudioSession } from "../types";
import { RecordButton } from "./recording/RecordButton";
import { SaveAsTranscriptButton } from "./conversion/SaveAsTranscriptButton";
import { CleanedTranscriptColumn } from "./columns/CleanedTranscriptColumn";
import { ConceptsColumn } from "./columns/ConceptsColumn";
import { ModuleColumn } from "./columns/ModuleColumn";
import { RawTranscriptColumn } from "./columns/RawTranscriptColumn";
import {
  STUDIO_COLUMN_PANEL_IDS,
  StudioColumnHandle,
  StudioPanelGroup,
} from "./resize/StudioPanelGroup";
import { ScrollSyncProvider } from "./scroll-sync/ScrollSyncProvider";
import { SettingsSidebar } from "./settings/SettingsSidebar";
import { useStudioSession } from "../hooks/useStudioSession";
import { useStudioSettings } from "../hooks/useStudioSettings";
import { useTriggerScheduler } from "../hooks/useTriggerScheduler";

// Side-effect import — populates the module registry so getModule(id) works
// from the moment any session view mounts. Adding a new module is a one-line
// import inside `modules/index.ts`.
import "../modules";

interface ActiveSessionViewProps {
  session: StudioSession;
  /** Server-supplied layout from the studio columns cookie. */
  defaultColumnLayout?: Layout;
}

/**
 * Active-session view (Phase 4): header + 4-column resizable shell wrapped
 * in the scroll-sync provider. Columns 2/3/4 are placeholder shells until
 * Phases 5-7 ship their respective agents and renderers; the resizable
 * geometry, persistence, and sync-scroll plumbing are all in place now so
 * later phases just drop content into existing columns.
 */
export function ActiveSessionView({
  session,
  defaultColumnLayout,
}: ActiveSessionViewProps) {
  const dispatch = useAppDispatch();
  const recording = useStudioSession({ sessionId: session.id });

  // First-paint hydration of raw + cleaned + concept registries. Subscribes
  // to stable booleans — doesn't re-fire on every appended chunk.
  const hasRawIds = useAppSelector((state) =>
    Boolean(state.transcriptStudio.rawIdsBySession[session.id]),
  );
  const hasCleanedIds = useAppSelector((state) =>
    Boolean(state.transcriptStudio.cleanedIdsBySession[session.id]),
  );
  const hasConceptIds = useAppSelector((state) =>
    Boolean(state.transcriptStudio.conceptIdsBySession[session.id]),
  );
  const hasModuleSegmentIds = useAppSelector((state) =>
    Boolean(state.transcriptStudio.moduleSegmentIdsBySession[session.id]),
  );
  useEffect(() => {
    if (!hasRawIds) {
      void dispatch(fetchRawSegmentsThunk({ sessionId: session.id }));
    }
    if (!hasCleanedIds) {
      void dispatch(fetchCleanedSegmentsThunk({ sessionId: session.id }));
    }
    if (!hasConceptIds) {
      void dispatch(fetchConceptItemsThunk({ sessionId: session.id }));
    }
    if (!hasModuleSegmentIds) {
      void dispatch(fetchModuleSegmentsThunk({ sessionId: session.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, dispatch]);

  // Per-session settings — feeds the trigger scheduler with effective
  // intervals (per-session overrides clamped to DB-enforced bounds, or
  // global defaults when no row exists yet).
  const { effective: studioSettings } = useStudioSettings(session.id);

  // Drive Columns 2/3/4 ticks while recording. Survives unmount only if
  // you stay on the studio route — leaving pauses agent passes until you
  // return. Recording itself lives in the global provider and continues.
  useTriggerScheduler({
    sessionId: session.id,
    cleaningIntervalMs: studioSettings.cleaningIntervalMs,
    conceptIntervalMs: studioSettings.conceptIntervalMs,
    moduleIntervalMs: studioSettings.moduleIntervalMs,
  });

  const [settingsOpen, setSettingsOpen] = useState(false);

  const subtitle = useMemo(() => {
    const created = new Date(session.createdAt).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const status = session.status === "idle" ? "ready" : session.status;
    const link = session.transcriptId ? "linked" : "standalone";
    return `${status} · ${link} · ${created}`;
  }, [session.createdAt, session.status, session.transcriptId]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-textured">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-sm font-semibold">{session.title}</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <SaveAsTranscriptButton
            sessionId={session.id}
            hasLinkedTranscript={Boolean(session.transcriptId)}
          />
          <RecordButton sessionId={session.id} />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open session settings"
            title="Session settings"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <SettingsSidebar
        sessionId={session.id}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-2">
        <div className="flex flex-1 min-h-0 overflow-hidden rounded-md border border-border/60 bg-background">
          <ScrollSyncProvider sessionId={session.id}>
            <StudioPanelGroup defaultLayout={defaultColumnLayout}>
              <ResizablePanel
                id={STUDIO_COLUMN_PANEL_IDS.raw}
                defaultSize="35%"
                minSize="15%"
                style={{ overflow: "hidden", height: "100%" }}
              >
                <RawTranscriptColumn
                  sessionId={session.id}
                  isRecording={recording.isOwnedRecording}
                />
              </ResizablePanel>

              <StudioColumnHandle />

              <ResizablePanel
                id={STUDIO_COLUMN_PANEL_IDS.cleaned}
                defaultSize="35%"
                minSize="15%"
                style={{ overflow: "hidden", height: "100%" }}
              >
                <CleanedTranscriptColumn sessionId={session.id} />
              </ResizablePanel>

              <StudioColumnHandle />

              <ResizablePanel
                id={STUDIO_COLUMN_PANEL_IDS.concepts}
                defaultSize="15%"
                minSize="10%"
                style={{ overflow: "hidden", height: "100%" }}
              >
                <ConceptsColumn sessionId={session.id} />
              </ResizablePanel>

              <StudioColumnHandle />

              <ResizablePanel
                id={STUDIO_COLUMN_PANEL_IDS.module}
                defaultSize="15%"
                minSize="10%"
                style={{ overflow: "hidden", height: "100%" }}
              >
                <ModuleColumn sessionId={session.id} />
              </ResizablePanel>
            </StudioPanelGroup>
          </ScrollSyncProvider>
        </div>
      </div>
    </div>
  );
}
