"use client";

/**
 * Opener for the `customAgentWindow` overlay — "Custom agent…": THE agent
 * picker window, then map the agent's inputs to what the menu captured.
 *
 * - `customAgentWindowAction()` — the plain action, for non-React callers (the
 *   rich-document action handler has `dispatch` but no hooks).
 * - `useOpenCustomAgentWindow()` — imperative hook.
 *
 * The captured values never enter Redux: they go in the custom-agent session
 * map and only the session id travels in the overlay data.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@ai-matrx/summon/open";
import {
  registerCustomAgentSession,
  type CustomAgentSession,
} from "@ai-matrx/chat/agents/components/custom-agent/session";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "customAgentWindow" as const;

export function customAgentWindowAction(session: CustomAgentSession) {
  const sessionId = registerCustomAgentSession(session);
  return openOverlay({
    overlayId: OVERLAY_ID,
    instanceId: sessionId,
    data: { sessionId },
  });
}

export function useOpenCustomAgentWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (session: CustomAgentSession) => {
      dispatch(customAgentWindowAction(session));
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CustomAgentWindowDefinitionData = Record<string, unknown>;

export const customAgentWindowOverlay = /* @__PURE__ */ defineOverlay<CustomAgentWindowDefinitionData>()({
  id: "customAgentWindow",
  label: "Custom agent",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { sessionId: null as string | null },
    windowId: "custom-agent-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    customAgentWindow: OverlayWire<CustomAgentWindowDefinitionData>;
  }
}
