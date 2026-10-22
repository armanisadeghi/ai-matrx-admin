"use client";

/**
 * Opener for the `liveRunWindow` overlay — the generic floating "watch this AI
 * run" panel.
 *
 * Use this instead of inserting a live-run block into your page. A block at the
 * top of a surface shifts everything below it the moment a run starts and puts
 * the model's output above the thing the user is editing; this floats, so the
 * page never moves and the user can keep working underneath.
 *
 * - `useOpenLiveRunWindow()` — imperative. Returns a handle with `instanceId`,
 *   `update(...)` (the run's requestId usually lands AFTER the window opens),
 *   and `close()`.
 * - `<LiveRunWindowController />` — declarative: mount to open, unmount to
 *   close, props flow straight through.
 * - `useFloatingLiveRun({active, instanceId, …})` — the one-hook migration for a
 *   surface whose run state already lives in React.
 * - `openLiveRunWindowAction({instanceId, …})` — the plain action, for
 *   thunk-style code that launches an agent and must float its own run without
 *   threading a callback up to a component just to call a hook.
 *
 * Pass a STABLE `instanceId` (e.g. `brief:${nodeId}`) when a surface should
 * reuse one window per subject rather than stacking a new one per click.
 */

import { useEffect, useRef, useMemo } from "react";

import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import type { OverlayWire } from "./overlay-types";
import { openLiveRunWindowAction, type OpenLiveRunWindowOptions } from "./liveRunWindow.action";
import { createOpener } from "@ai-matrx/summon/opener";
import { mintInstanceId } from "@ai-matrx/summon/boot";

const OVERLAY_ID = "liveRunWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

// The options and the plain action live in liveRunWindow.action.ts (import them from there): a
// caller that only dispatches the action never keeps this module's openers and controllers.

export interface LiveRunWindowHandle {
  instanceId: string;
  /** Re-open with merged data — how a late `requestId` reaches the window. */
  update: (patch: Partial<OpenLiveRunWindowOptions>) => void;
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createLiveRunWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenLiveRunWindowOptions = {}): LiveRunWindowHandle => {
    const instanceId = opts.instanceId ?? mintInstanceId(OVERLAY_ID);
    let current: OpenLiveRunWindowOptions = { ...opts };

    const push = () =>
      dispatch(openLiveRunWindowAction({ ...current, instanceId }));

    push();
    return {
      instanceId,
      update: (patch) => {
        current = { ...current, ...patch };
        push();
      },
      close: () =>
        dispatch(opener.close(instanceId)),
    };
  };
}

export function useOpenLiveRunWindow() {
  const store = useAppStore();
  return useMemo(() => createLiveRunWindowOpener(store), [store]);
}

export interface FloatingLiveRunOptions extends Omit<
  OpenLiveRunWindowOptions,
  "pending" | "instanceId"
> {
  /** True while the run is in flight. The window opens on the false→true edge. */
  active: boolean;
  /** Stable per-subject id so re-running reuses ONE window instead of stacking. */
  instanceId: string;
}

/**
 * 🚨 THE FLOATING LAW, as one hook — the migration for a surface that renders
 * `<LiveRunDisplay>` inline ABOVE its own content.
 *
 * An inline block shifts everything below it the instant a run starts; this
 * opens the canonical floating window instead, so the page never moves. It:
 *
 * - opens on the run's false→true edge (`pending`, before a requestId exists),
 * - pushes the `requestId` / `conversationId` / `label` in as they land,
 * - **never auto-closes** — not on completion, and NOT on unmount. The finished
 *   output is what the user came for, and a host that remounts when its results
 *   land (a query invalidation, a route re-render) would otherwise close the
 *   window at the exact moment the content completed. Verified on
 *   `/marketing/keyword-research`, where the results refetch remounts the
 *   launcher. The window is ephemeral and has its own close button; the USER
 *   dismisses it, and a long run keeps streaming while they work elsewhere.
 *
 * Because the `instanceId` is stable, a remount mid-run re-binds the SAME
 * window instead of stacking a second one.
 */
export function useFloatingLiveRun(opts: FloatingLiveRunOptions): void {
  const open = useOpenLiveRunWindow();
  const handleRef = useRef<LiveRunWindowHandle | null>(null);
  const {
    active,
    instanceId,
    conversationId,
    requestId,
    runSetKey,
    label,
    width,
    height,
    progress,
    initialMinimized,
    workingMessage,
    completeMessage,
  } = opts;

  useEffect(() => {
    if (!active) return;
    if (!handleRef.current) {
      handleRef.current = open({ instanceId, pending: true, width, height });
    }
    handleRef.current.update({
      conversationId,
      requestId,
      runSetKey,
      label,
      progress,
      initialMinimized,
      workingMessage,
      completeMessage,
      // `pending` only until a stream handle exists to bind.
      pending: !requestId && !conversationId,
    });
  }, [
    active,
    open,
    instanceId,
    conversationId,
    requestId,
    runSetKey,
    label,
    width,
    height,
    progress,
    initialMinimized,
    workingMessage,
    completeMessage,
  ]);
}

/**
 * Declarative form. Renders nothing visible; opens on mount, closes on
 * unmount, and pushes prop changes into the open window.
 */
export function LiveRunWindowController(
  props: OpenLiveRunWindowOptions & { instanceId: string },
): null {
  const open = useOpenLiveRunWindow();
  const handleRef = useRef<LiveRunWindowHandle | null>(null);
  const {
    instanceId,
    conversationId,
    requestId,
    runSetKey,
    label,
    pending,
    width,
    height,
    progress,
    initialMinimized,
    workingMessage,
    completeMessage,
  } = props;

  useEffect(() => {
    const handle = open({ instanceId });
    handleRef.current = handle;
    return () => {
      handle.close();
      handleRef.current = null;
    };
  }, [open, instanceId]);

  useEffect(() => {
    handleRef.current?.update({
      conversationId,
      requestId,
      runSetKey,
      label,
      pending,
      width,
      height,
      progress,
      initialMinimized,
      workingMessage,
      completeMessage,
    });
  }, [
    conversationId,
    requestId,
    runSetKey,
    label,
    pending,
    width,
    height,
    progress,
    initialMinimized,
    workingMessage,
    completeMessage,
  ]);

  return null;
}

export type LiveRunWindowDefinitionData = OpenLiveRunWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    liveRunWindow: OverlayWire<LiveRunWindowDefinitionData>;
  }
}
