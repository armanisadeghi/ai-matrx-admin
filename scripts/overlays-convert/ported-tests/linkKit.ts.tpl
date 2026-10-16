/**
 * Test kit for the app's overlay links: the package's link door (`hydrateLinkToken`, the grammar)
 * over the app definitions' `link.hydrate`, in the shapes the app's link tests read. Test-only.
 */
import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { getOverlayMetaByLinkKey } from "@ai-matrx/overlays";
import { canonicalLinkKey, formatLinkToken, hydrateLinkToken, parseLinkParam, type TokenOutcome } from "@ai-matrx/overlays/url";
import { ensureAppOverlaysRegistered } from "../register";

export { ensureAppOverlaysRegistered as registerAppLinks };

export interface PanelToken {
  typeKey: string;
  instanceId: string;
  args?: Record<string, string>;
}

/** `?panels=` value → tokens (grammar v2, reads v1). */
export function parsePanels(param: string): PanelToken[] {
  return parseLinkParam(param).map((t) => ({ typeKey: t.key, instanceId: t.id ?? "", ...(t.args ? { args: { ...t.args } } : {}) }));
}

/** Tokens → `?panels=` value, exactly as the link manager writes it. */
export function serializePanels(entries: readonly PanelToken[]): string {
  return entries.map((e) => formatLinkToken({ key: e.typeKey, id: e.instanceId, args: e.args })).join(",");
}

export type LinkHydrator = (dispatch: unknown, id: string, args?: Record<string, string>) => Promise<TokenOutcome>;

/** The registered definition's hydrator for a link key (aliases resolved); undefined when none owns it. */
export function linkHydrator(key: string): LinkHydrator | undefined {
  ensureAppOverlaysRegistered();
  const canonical = canonicalLinkKey(key);
  if (!getOverlayMetaByLinkKey(canonical)?.link) return undefined;
  return async (dispatch, id, args = {}) =>
    hydrateLinkToken({ raw: `${canonical}:${id}`, key: canonical, id, args }, dispatch as Dispatch<UnknownAction>);
}
