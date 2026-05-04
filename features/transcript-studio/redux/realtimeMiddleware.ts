// Two-channel realtime middleware for the studio.
//
// Channel A (sessions): subscribed once after the first sessions list fetch,
// keeps the sidebar in sync across tabs/devices for the same user. Filtered
// by `user_id`.
//
// Channel B (active session): subscribed when an active session is selected
// and torn down + rebuilt when the active session changes. Listens to the
// four per-segment tables filtered by `session_id`. Reducers are idempotent
// (skip-if-exists), so no echo suppression is required for inserts; UPDATEs
// on `studio_cleaned_segments` re-apply via cleanedSegmentApplied which
// also handles supersession.
//
// Pattern stolen from features/notes/redux/realtimeMiddleware.ts.
import type { Middleware } from "@reduxjs/toolkit";
import { supabase } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RootState } from "@/lib/redux/store";
import {
  rowToSession,
  rowToRawSegment,
  rowToCleanedSegment,
  rowToConceptItem,
  rowToModuleSegment,
  type SessionRow,
  type RawSegmentRow,
  type CleanedSegmentRow,
  type ConceptItemRow,
  type ModuleSegmentRow,
} from "../service/studioService";
import {
  sessionUpserted,
  sessionRemoved,
  rawSegmentsAppended,
  cleanedSegmentApplied,
  conceptsAppended,
  moduleSegmentsAppended,
} from "./slice";
import { fetchSessionsThunk } from "./thunks";

let sessionsChannel: RealtimeChannel | null = null;
let activeSessionChannel: RealtimeChannel | null = null;
let activeSessionId: string | null = null;

function teardownSessions() {
  if (sessionsChannel) {
    supabase.removeChannel(sessionsChannel);
    sessionsChannel = null;
  }
}

function teardownActiveSession() {
  if (activeSessionChannel) {
    supabase.removeChannel(activeSessionChannel);
    activeSessionChannel = null;
    activeSessionId = null;
  }
}

export const transcriptStudioRealtimeMiddleware: Middleware =
  (storeApi) => (next) => (action) => {
    const result = next(action);
    const state = storeApi.getState() as RootState;
    const userId = state.userAuth?.id;

    // Subscribe to sessions table once after the first list fetch
    if (fetchSessionsThunk.fulfilled.match(action) && userId && !sessionsChannel) {
      sessionsChannel = supabase
        .channel(`studio-sessions-rt:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "studio_sessions",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newRow = payload.new as SessionRow | undefined;
            const oldRow = payload.old as SessionRow | undefined;
            if (payload.eventType === "DELETE" && oldRow?.id) {
              storeApi.dispatch(sessionRemoved(oldRow.id));
              return;
            }
            if (newRow?.id) {
              if (newRow.is_deleted) {
                storeApi.dispatch(sessionRemoved(newRow.id));
                return;
              }
              storeApi.dispatch(sessionUpserted(rowToSession(newRow)));
            }
          },
        )
        .subscribe();
    }

    // Active-session change → re-subscribe per-session segment channel
    const nextActiveId = state.transcriptStudio?.activeSessionId ?? null;
    if (nextActiveId !== activeSessionId) {
      teardownActiveSession();
      if (nextActiveId) {
        activeSessionId = nextActiveId;
        const sid = nextActiveId;
        activeSessionChannel = supabase
          .channel(`studio-segments-rt:${sid}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "studio_raw_segments",
              filter: `session_id=eq.${sid}`,
            },
            (payload) => {
              const row = payload.new as RawSegmentRow | undefined;
              if (!row) return;
              storeApi.dispatch(
                rawSegmentsAppended({
                  sessionId: sid,
                  segments: [rowToRawSegment(row)],
                }),
              );
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "studio_cleaned_segments",
              filter: `session_id=eq.${sid}`,
            },
            (payload) => {
              const row = payload.new as CleanedSegmentRow | undefined;
              if (!row) return;
              storeApi.dispatch(
                cleanedSegmentApplied({
                  sessionId: sid,
                  segment: rowToCleanedSegment(row),
                }),
              );
            },
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "studio_concept_items",
              filter: `session_id=eq.${sid}`,
            },
            (payload) => {
              const row = payload.new as ConceptItemRow | undefined;
              if (!row) return;
              storeApi.dispatch(
                conceptsAppended({
                  sessionId: sid,
                  items: [rowToConceptItem(row)],
                }),
              );
            },
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "studio_module_segments",
              filter: `session_id=eq.${sid}`,
            },
            (payload) => {
              const row = payload.new as ModuleSegmentRow | undefined;
              if (!row) return;
              storeApi.dispatch(
                moduleSegmentsAppended({
                  sessionId: sid,
                  segments: [rowToModuleSegment(row)],
                }),
              );
            },
          )
          .subscribe();
      }
    }

    if ((action as { type?: string }).type === "transcriptStudio/resetState") {
      teardownSessions();
      teardownActiveSession();
    }

    return result;
  };
