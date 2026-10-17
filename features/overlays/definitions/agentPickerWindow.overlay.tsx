"use client";

/**
 * Opener for the `agentPickerWindow` overlay — THE agent picker as a floating
 * window (the dropdown's exact two-column picker, same size).
 *
 *   const openAgentPicker = useOpenAgentPickerWindow();
 *   openAgentPicker({ onPicked: (e) => setAgentId(e.agentId) });
 *
 * - `useOpenAgentPickerWindow()` — imperative hook, returns a handle.
 * - `<AgentPickerWindowController />` — declarative wrapper.
 *
 * Callbacks never enter Redux: the opener creates a callback group and only
 * its id travels in the overlay data.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import {
  createAgentPickerCallbackGroup,
  type AgentPickerHandlers,
  type AgentPickerWindowData,
} from "@/features/window-panels/windows/agents/agent-picker-callbacks";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { UntypedOverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentPickerWindow" as const;

export interface OpenAgentPickerWindowOptions extends AgentPickerHandlers {
  /** Window title. Defaults to "Select Agent". */
  title?: string;
  /** Highlights + previews this agent when the picker opens. */
  activeAgentId?: string | null;
  /** Optional stable instance id. Omit for a fresh window per call. */
  instanceId?: string;
}

export interface AgentPickerWindowHandle {
  instanceId: string;
  /** Close the window and stop receiving events. */
  close: () => void;
}

export function useOpenAgentPickerWindow() {
  const dispatch = useAppDispatch();
  const disposersRef = useRef<Set<() => void>>(new Set());

  useEffect(() => {
    const disposers = disposersRef.current;
    return () => {
      for (const dispose of disposers) dispose();
      disposers.clear();
    };
  }, []);

  return useCallback(
    (options: OpenAgentPickerWindowOptions = {}): AgentPickerWindowHandle => {
      const instanceId =
        options.instanceId ??
        `${OVERLAY_ID}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { callbackGroupId, dispose } = createAgentPickerCallbackGroup({
        ...(options.onPicked ? { onPicked: options.onPicked } : {}),
        onWindowClose: (e) => {
          options.onWindowClose?.(e);
          dispose();
          disposersRef.current.delete(dispose);
        },
      });
      disposersRef.current.add(dispose);
      const data: AgentPickerWindowData = {
        callbackGroupId,
        title: options.title ?? null,
        activeAgentId: options.activeAgentId ?? null,
      };
      dispatch(openOverlay({ overlayId: OVERLAY_ID, instanceId, data }));
      return {
        instanceId,
        close: () => {
          dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId }));
          dispose();
          disposersRef.current.delete(dispose);
        },
      };
    },
    [dispatch],
  );
}

export function AgentPickerWindowController(
  props: OpenAgentPickerWindowOptions,
): null {
  const open = useOpenAgentPickerWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.instanceId, props.title, props.activeAgentId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentPickerWindowDefinitionData = OpenAgentPickerWindowOptions;

export const agentPickerWindowOverlay = defineOverlay<AgentPickerWindowDefinitionData>()({
  id: "agentPickerWindow",
  label: "Select Agent",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null as string | null,
          title: null as string | null,
          activeAgentId: null as string | null,
        },
    windowId: "agent-picker-window",
    mobile: "drawer",
    ephemeral: true,
  },
  render: () => import("./agentPickerWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentPickerWindow: UntypedOverlayWire;
  }
}
