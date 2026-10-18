import type { CropStudioWindowDefinitionData } from "./cropStudioWindow.overlay";
import { getRestorableResourceId } from "./link-helpers";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id: rawId, open }: LinkHydrateContext<CropStudioWindowDefinitionData>) {
    const id = getRestorableResourceId(rawId, "cropStudioWindow");
    dispatch(
      openOverlay({
        overlayId: "cropStudioWindow",
        data: id ? { folderId: id } : null,
      }),
    );
}
