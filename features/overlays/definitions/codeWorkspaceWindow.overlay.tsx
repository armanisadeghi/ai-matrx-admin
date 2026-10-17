"use client";

/**
 * Opener for the `codeWorkspaceWindow` overlay.
 *
 * - `useOpenCodeWorkspaceWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CodeWorkspaceWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "codeWorkspaceWindow" as const;

export interface OpenCodeWorkspaceWindowOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  windowInstanceId: string;
  title?: string | null;
  /** TODO: tighten to `FilesystemAdapter` once that type is imported. */
  adapter?: unknown;
  /** TODO: tighten to `ProcessAdapter` once that type is imported. */
  process?: unknown;
  /** TODO: tighten to `React.ReactNode` once that type is imported. */
  rightSlot?: unknown;
  /** TODO: tighten to `React.ReactNode` once that type is imported. */
  farRightSlot?: unknown;
  hideChat?: boolean;
  hideHistory?: boolean;
}

export interface CodeWorkspaceWindowHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenCodeWorkspaceWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenCodeWorkspaceWindowOptions): CodeWorkspaceWindowHandle => {
      const instanceId = opts.instanceId ?? `codeWorkspaceWindow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
            windowInstanceId: opts.windowInstanceId,
            title: opts.title,
            adapter: opts.adapter,
            process: opts.process,
            rightSlot: opts.rightSlot,
            farRightSlot: opts.farRightSlot,
            hideChat: opts.hideChat,
            hideHistory: opts.hideHistory,
          },
        }),
      );
      return {
        instanceId,
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
      };
    },
    [dispatch],
  );
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function CodeWorkspaceWindowController(props: OpenCodeWorkspaceWindowOptions): null {
  const open = useOpenCodeWorkspaceWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.windowInstanceId, props.title, props.adapter, props.process, props.rightSlot, props.farRightSlot, props.hideChat, props.hideHistory]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CodeWorkspaceWindowDefinitionData = OpenCodeWorkspaceWindowOptions;

export const codeWorkspaceWindowOverlay = /* @__PURE__ */ defineOverlay<CodeWorkspaceWindowDefinitionData>()({
  id: "codeWorkspaceWindow",
  label: "Code Workspace Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { title: null, sandboxId: null },
    windowId: "code-workspace",
    mobile: "fullscreen",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    codeWorkspaceWindow: OverlayWire<CodeWorkspaceWindowDefinitionData>;
  }
}
