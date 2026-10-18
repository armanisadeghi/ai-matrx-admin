import type { GoogleConnectWindowDefinitionData } from "./googleConnectWindow.overlay";
import { getRestorableResourceId } from "./link-helpers";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<GoogleConnectWindowDefinitionData>) {
    const reason = getRestorableResourceId(id, "googleConnectWindow");
    dispatch(
      openOverlay({
        overlayId: "googleConnectWindow",
        data: reason ? { reason } : null,
      }),
    );
}
