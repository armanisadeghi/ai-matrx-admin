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

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { mintInstanceId } from "@ai-matrx/summon/open";
import {
  createAgentPickerCallbackGroup,
  type AgentPickerHandlers,
  type AgentPickerWindowData,
} from "@/features/window-panels/windows/agents/agent-picker-callbacks";
import type { UntypedOverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = "agentPickerWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

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

  // The opened window owns its callback group (it releases it on close / its own window-close
  // event); this hook never drops it on unmount — a menu or sheet that opened the window unmounts
  // first (an-opened-window-owns-its-callback-group.test.ts).

  return useCallback(
    (options: OpenAgentPickerWindowOptions = {}): AgentPickerWindowHandle => {
      const instanceId =
        options.instanceId ??
        mintInstanceId(OVERLAY_ID);
      const { callbackGroupId, dispose } = createAgentPickerCallbackGroup({
        ...(options.onPicked ? { onPicked: options.onPicked } : {}),
        onWindowClose: (e) => {
          options.onWindowClose?.(e);
          dispose();
        },
      });
      const data: AgentPickerWindowData = {
        callbackGroupId,
        title: options.title ?? null,
        activeAgentId: options.activeAgentId ?? null,
      };
      opener.open(dispatch, { instanceId, data });
      return {
        instanceId,
        close: () => {
          dispatch(opener.close(instanceId));
          dispose();
        },
      };
    },
    [dispatch],
  );
}

export const AgentPickerWindowController = hookController<OpenAgentPickerWindowOptions>(useOpenAgentPickerWindow);

export type AgentPickerWindowDefinitionData = OpenAgentPickerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentPickerWindow: UntypedOverlayWire;
  }
}
