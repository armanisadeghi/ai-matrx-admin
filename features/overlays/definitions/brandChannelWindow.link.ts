import type { BrandChannelWindowDefinitionData } from "./brandChannelWindow.overlay";
import { getRestorableResourceId } from "./link-helpers";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<BrandChannelWindowDefinitionData>) {
    const brandId = getRestorableResourceId(id, "brandChannelWindow");
    if (!brandId) {
      console.warn(
        `[UrlPanelManager] ?panels=brand_channel:${id} names no brand — expected brand_channel:<brandId>.`,
      );
      return;
    }
    dispatch(
      openOverlay({
        overlayId: "brandChannelWindow",
        data: { brandId, brandLabel: null },
      }),
    );
}
