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
import { createOpener } from "@ai-matrx/summon/opener";
import {
  registerCustomAgentSession,
  type CustomAgentSession,
} from "@ai-matrx/chat/agents/components/custom-agent/session";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "customAgentWindow" as const;
const opener = createOpener<{ sessionId: string }>(OVERLAY_ID);

export function customAgentWindowAction(session: CustomAgentSession) {
  const sessionId = registerCustomAgentSession(session);
  return opener.openAction({ sessionId }, sessionId);
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

export type CustomAgentWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    customAgentWindow: OverlayWire<CustomAgentWindowDefinitionData>;
  }
}
