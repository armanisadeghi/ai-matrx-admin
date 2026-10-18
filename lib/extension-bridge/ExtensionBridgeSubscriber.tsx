/**
 * ExtensionBridgeSubscriber — top-level subscriber that wires the
 * matrx-extend Chrome extension's bridge into this app's window-panels
 * system.
 *
 * Mounted once near the root of the authenticated provider tree (see
 * `app/Providers.tsx`). When the extension publishes an
 * `extension->frontend` envelope with `action: "openPanel"`, this
 * component:
 *
 *   1. Forwards the payload to `handleExtensionOpenPanel(...)`, which
 *      validates and dispatches `openOverlay`.
 *   2. Publishes a `frontend->extension` reply on the same Broadcast
 *      channel, preserving the inbound `requestId` so the extension
 *      SW's pending-promise table resolves cleanly.
 *
 * Why this lives in its own component (not in `useExtensionBridgeChannel`):
 * the hook is generic — every consumer registers its own `onMessage`
 * handler. The window-panels translation belongs at the consumer layer
 * so the hook stays free of feature-specific knowledge.
 *
 * Renders nothing. Every signed-in tab joins `matrx-extension-bridge:<userId>`,
 * but only once the page settled AND was engaged (`useEngagedLateReady`) — never at first paint.
 * The broadcast exists for the cross-device case (the extension is on a different
 * machine and "every open frontend tab answers", CHANNELS.md §C), so a local
 * `chrome.runtime` ping cannot gate it. Bundles only this file + `openPanelHandler`
 * + the Redux action — no window-panels component code is pulled into the static graph.
 */

"use client";

import { useEffect } from "react";
import { useEngagedLateReady } from "@/lib/boot/engagedLate";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useExtensionBridgeChannel } from "@/hooks/useExtensionBridgeChannel";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import {
  handleExtensionOpenPanel,
  type OpenPanelResult,
} from "./openPanelHandler";

export function ExtensionBridgeSubscriber() {
  const userId = useSelector(selectUserId);
  const settled = useEngagedLateReady();

  if (!settled || !userId) return null;
  return <ExtensionBridgeChannel />;
}

function ExtensionBridgeChannel(): null {
  const dispatch = useAppDispatch();
  const userId = useSelector(selectUserId);
  const { onMessage, reply, isAuthenticated } = useExtensionBridgeChannel();

  useEffect(() => {
    // Hook short-circuits when no user is signed in; nothing to wire up.
    if (!isAuthenticated || !userId) return undefined;

    const unsubscribe = onMessage((envelope) => {
      // Hook already filters to `direction: "extension->frontend"`, so
      // every envelope here is genuinely inbound.
      if (envelope.action !== "openPanel") return;

      // Translate + dispatch. The first envelope loads the link door and the
      // overlay definitions (never in the boot graph); the result is published back.
      // A door that fails to load answers with its error, never silence.
      void handleExtensionOpenPanel(dispatch, envelope.payload)
        .catch((error: unknown): OpenPanelResult => ({
          ok: false,
          error: "open_failed",
          details: error instanceof Error ? error.message : String(error),
        }))
        .then((result) => reply(envelope, result));

      // Publish the reply on the same Broadcast channel, echoing the inbound
      // requestId — the hook's `reply` exists for exactly that, because a
      // freshly minted id would resolve the wrong caller in the extension's
      // pending-promise table. A publish while the channel is down is reported
      // by `@ai-matrx/data/realtime`'s diagnostics (`channel.send.not-connected`),
      // not swallowed here; the extension retries or falls back to its
      // same-machine `chrome.runtime.sendMessage` path.
    });

    return unsubscribe;
  }, [dispatch, isAuthenticated, onMessage, reply, userId]);

  return null;
}
