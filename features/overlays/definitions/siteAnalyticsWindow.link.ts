import { getRestorableResourceId } from "./link-helpers";
import type { SiteAnalyticsWindowDefinitionData } from "./siteAnalyticsWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<SiteAnalyticsWindowDefinitionData>) {
    const siteId = getRestorableResourceId(id, "siteAnalyticsWindow");
    if (!siteId) {
      console.warn(
        `[UrlPanelManager] ?panels=site_analytics:${id} names no site — expected site_analytics:<siteId>.`,
      );
      return;
    }
    dispatch(
      openOverlay({
        overlayId: "siteAnalyticsWindow",
        data: { siteId, siteLabel: null },
      }),
    );
}
