import { getRestorableResourceId } from "./link-helpers";
import type { PickListManagerWindowDefinitionData } from "./pickListManagerWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<PickListManagerWindowDefinitionData>) {
    const forcedListId = getRestorableResourceId(
      id,
      "pickListManagerWindow",
    );
    dispatch(
      openOverlay({
        overlayId: "pickListManagerWindow",
        data: forcedListId ? { forcedListId } : null,
      }),
    );
}
