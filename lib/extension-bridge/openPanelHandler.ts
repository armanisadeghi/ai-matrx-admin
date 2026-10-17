/**
 * openPanelHandler — extension-bridge → window-panels glue.
 *
 * The matrx-extend Chrome extension publishes
 * `{ action: "openPanel", payload: { panelId, instanceId?, data? } }`
 * envelopes when it wants this app to surface a specific overlay (modal,
 * floating window, etc.) without the user navigating manually.
 *
 * This module owns the translation:
 *   1. Validate the inbound payload with `OpenPanelPayloadSchema`.
 *   2. Confirm `panelId` is a registered overlayId (`isOverlayId` — a key of
 *      `APP_OVERLAYS` in `features/overlays/definitions/registry.ts`).
 *   3. Dispatch the existing `openOverlay({ overlayId, instanceId, data })`
 *      Redux action — exactly the same path every in-app caller takes.
 *
 * It does NOT touch the registry or the URL hydrator: the
 * `?panels=<typeKey>:<instanceId>` deep-link path remains unchanged for
 * cases where the extension prefers to navigate the active tab instead
 * of cross-machine signaling.
 *
 * Consumers:
 *   - `lib/extension-bridge/ExtensionBridgeSubscriber.tsx` — top-level
 *     subscriber that receives `extension->frontend` envelopes and
 *     forwards `openPanel` actions here.
 *
 * Wire format: see `lib/types/bridge-envelope.ts` (OpenPanelPayloadSchema)
 * and `/Users/armanisadeghi/code/common-docs/systems/apps/extension/CHANNELS.md`.
 */

import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { openPanelRequest } from "@ai-matrx/summon/url";
import { OpenPanelPayloadSchema } from "@/lib/types/bridge-envelope";
import { ensureAppOverlaysRegistered } from "@/features/overlays/definitions/register";

/**
 * Result returned to the extension over the bridge. Mirrors the
 * `FrontendRpcResponse` shape so the extension's `chrome.runtime.sendMessage`
 * callback and its Broadcast reply handler can use one branch.
 */
export type OpenPanelResult =
  | { ok: true; opened: true; panelId: string; instanceId: string | null }
  | { ok: false; error: string; details?: unknown };

/**
 * Translate an inbound `openPanel` envelope into an overlay open through the package's one
 * link door (`openPanelRequest`: registered-id check, default instance, same open path every
 * in-app caller takes). The envelope is validated against the bridge schema first.
 */
export function handleExtensionOpenPanel(
  dispatch: Dispatch<UnknownAction>,
  rawPayload: unknown,
): OpenPanelResult {
  const parsed = OpenPanelPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return { ok: false, error: "invalid_payload", details: parsed.error.issues };
  }
  ensureAppOverlaysRegistered();
  const result = openPanelRequest(parsed.data, { dispatch });
  if (!result.ok) return { ok: false, error: result.error, details: result.details };
  return { ok: true, opened: true, panelId: result.panelId, instanceId: result.instanceId };
}
