"use client";

/**
 * Opener for the `sendToAgentWindow` overlay — "Send to another agent…": pick
 * any agent (THE agent picker window), choose where the content goes (one of its variables or context
 * slots, "Important context", or "Your message"), and the agent opens in a
 * floating window with it in place, unsent.
 *
 * - `useOpenSendToAgentWindow()` — imperative hook, returns a handle.
 * - `<SendToAgentWindowController />` — declarative wrapper.
 * - `sendToAgentWindowAction()` — the plain action, for non-React callers (the
 *   rich-document action handler, which has `dispatch` but no hooks).
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "sendToAgentWindow" as const;
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenSendToAgentWindowOptions {
  /** The text being sent on to another agent. */
  initialContent: string;
  /** Where it came from (e.g. the conversation title) — shown in the window. */
  initialSourceTitle?: string | null;
}

export interface SendToAgentWindowHandle {
  close: () => void;
}

export function sendToAgentWindowAction(opts: OpenSendToAgentWindowOptions) {
  return opener.openAction({
    initialContent: opts.initialContent,
    initialSourceTitle: opts.initialSourceTitle ?? null,
  });
}

export function useOpenSendToAgentWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenSendToAgentWindowOptions): SendToAgentWindowHandle => {
      dispatch(sendToAgentWindowAction(opts));
      return {
        close: () => dispatch(opener.close()),
      };
    },
    [dispatch],
  );
}

export const SendToAgentWindowController = hookController<OpenSendToAgentWindowOptions>(useOpenSendToAgentWindow);

export type SendToAgentWindowDefinitionData = OpenSendToAgentWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    sendToAgentWindow: OverlayWire<SendToAgentWindowDefinitionData>;
  }
}
