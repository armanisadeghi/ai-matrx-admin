import { getRestorableResourceId } from "./link-helpers";
import type { SiteQuickViewWindowDefinitionData } from "./siteQuickViewWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<SiteQuickViewWindowDefinitionData>) {
    const siteId = getRestorableResourceId(id, "siteQuickViewWindow");
    if (!siteId) {
      console.warn(
        `[UrlPanelManager] ?panels=site_quick_view:${id} names no site — expected site_quick_view:<siteId>.`,
      );
      return;
    }
    dispatch(
      openOverlay({
        overlayId: "siteQuickViewWindow",
        data: { siteId, siteLabel: null },
      }),
    );
}
