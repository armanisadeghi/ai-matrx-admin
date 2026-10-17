import { getRestorableResourceId } from "./link-helpers";
import type { SiteTrackingWindowDefinitionData } from "./siteTrackingWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<SiteTrackingWindowDefinitionData>) {
    const siteId = getRestorableResourceId(id, "siteTrackingWindow");
    if (!siteId) {
      console.warn(
        `[UrlPanelManager] ?panels=site_tracking:${id} names no site — expected site_tracking:<siteId>.`,
      );
      return;
    }
    dispatch(
      openOverlay({
        overlayId: "siteTrackingWindow",
        data: { siteId, siteLabel: null },
      }),
    );
}
