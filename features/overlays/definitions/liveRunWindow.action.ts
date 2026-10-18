"use client";

// `liveRunWindow`'s option shape and its plain open action, apart from the opener module
// (liveRunWindow.overlay.tsx) so a thunk, middleware or menu that only dispatches it stays light.
import type { LiveRunProgressState } from "@ai-matrx/chat/agents/components/live-run/LiveRunProgress";
import { openOverlay } from "@ai-matrx/summon/open";

const OVERLAY_ID = "liveRunWindow" as const;

export interface OpenLiveRunWindowOptions {
  /** Preferred binding — a conversation-backed run. */
  conversationId?: string | null;
  /** Adopted server-pipeline runs bind by request id. */
  requestId?: string | null;
  /** Multi-run surfaces bind the window to one stable Redux run-set key. */
  runSetKey?: string | null;
  /** What the user is watching, e.g. "Drafting brief". */
  label?: string | null;
  /** Launched, but no stream has connected yet. */
  pending?: boolean;
  /** The launch failed before a stream existed: its reason, shown in the window. */
  failure?: string | null;
  /** Stable id to reuse one window per subject. Omit for a fresh window. */
  instanceId?: string;
  /**
   * Per-kind size override — only after watching that kind render in the
   * default box and seeing it be wrong. The default matches the `/chat`
   * reading column, which is what every kind component is tuned against.
   */
  width?: number | string;
  height?: number | string;
  /** Stable row-based progress for non-token work; replaces the transcript. */
  progress?: LiveRunProgressState | null;
  /** Start in the desktop tray; mobile restores because it has no tray. */
  initialMinimized?: boolean;
  /** Friendly Assist-specific copy shown while the minimized run is active. */
  workingMessage?: string | null;
  /** Friendly copy shown in the tray after the run finishes. */
  completeMessage?: string | null;
}

/**
 * The plain action — the same window, opened from anywhere a hook cannot run
 * (a thunk, a middleware, a callback outside React). Dispatching it again with
 * the same `instanceId` re-binds the open window to a new run, which is how a
 * long multi-step pipeline keeps ONE window instead of stacking one per step.
 */
export function openLiveRunWindowAction(
  opts: OpenLiveRunWindowOptions & { instanceId: string },
) {
  return openOverlay({
    overlayId: OVERLAY_ID,
    instanceId: opts.instanceId,
    data: {
      windowInstanceId: opts.instanceId,
      conversationId: opts.conversationId ?? null,
      requestId: opts.requestId ?? null,
      runSetKey: opts.runSetKey ?? null,
      label: opts.label ?? null,
      pending: opts.pending ?? false,
      failure: opts.failure ?? null,
      // Undefined (not null) so the component's chat-matched defaults
      // apply — an explicit null would be passed through as a size.
      width: opts.width,
      height: opts.height,
      progress: opts.progress ?? null,
      initialMinimized: opts.initialMinimized ?? false,
      workingMessage: opts.workingMessage ?? null,
      completeMessage: opts.completeMessage ?? null,
    },
  });
}

