import type { CreatorHubDefinitionData } from "./creatorHub.overlay";
import { getRestorableResourceId } from "./link-helpers";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<CreatorHubDefinitionData>) {
    const initialTab = getRestorableResourceId(id, "creatorHub");
    dispatch(
      openOverlay({
        overlayId: "creatorHub",
        data: initialTab ? { initialTab } : null,
      }),
    );
}
