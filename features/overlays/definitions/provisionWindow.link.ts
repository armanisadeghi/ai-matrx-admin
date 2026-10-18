import type { ProvisionWindowDefinitionData } from "./provisionWindow.overlay";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<ProvisionWindowDefinitionData>) {
    // Only a snapshot id deep-links; the window's own identity is not a snapshot.
    if (isUuidShape(id)) {
      dispatch(openOverlay({ overlayId: "provisionWindow", data: { snapshotId: id } }));
    }
}
