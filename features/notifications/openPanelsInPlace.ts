/**
 * features/notifications/openPanelsInPlace.ts — open a link's `?panels=`
 * windows on the CURRENT page, through the same hydrators a first page load
 * uses.
 *
 * Loaded lazily by `InboxPanel` on the click that needs it: the hydrator table
 * (`initUrlHydration`) imports every window family's restore thunks, which
 * have no business in the header bell's boot bundle.
 *
 * All or nothing: if ANY token names a key with no registered hydrator, nothing
 * is dispatched and the caller opens the link in a new tab — half a link opened
 * in place is a link that silently lost its other half.
 */
import type { AppDispatch } from "@/lib/redux/store";
import { getOverlayMetaByLinkKey } from "@ai-matrx/summon/open";
import { canonicalLinkKey, openFromLink, parseLinkParam, withPanelsParam } from "@ai-matrx/summon/url";
import { ensureAppOverlaysRegistered } from "@/features/overlays/definitions/register";

export type OpenInPlaceResult =
  { opened: true; keys: string[] } | { opened: false; missingKeys: string[] };

/**
 * Open a notification's `?panels=` value in place — all or nothing: when any key has no
 * registered definition nothing opens and the caller opens the link in a new tab instead.
 */
export function openPanelsInPlace(
  dispatch: AppDispatch,
  panelsParam: string,
): OpenInPlaceResult {
  ensureAppOverlaysRegistered();
  const tokens = parseLinkParam(panelsParam);
  const missingKeys = tokens
    .filter((token) => !getOverlayMetaByLinkKey(canonicalLinkKey(token.key)))
    .map((token) => token.key);
  if (tokens.length === 0 || missingKeys.length > 0) {
    return { opened: false, missingKeys };
  }
  // Every key is known, so nothing is refused for being unknown; sync hydrators have dispatched
  // before this returns.
  void openFromLink(withPanelsParam("", panelsParam), { dispatch, requireAll: true });
  return { opened: true, keys: tokens.map((token) => token.key) };
}
