import { getRestorableResourceId } from "./link-helpers";
import type { SearchReviewWindowDefinitionData } from "./searchReviewWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<SearchReviewWindowDefinitionData>) {
    const sessionId = getRestorableResourceId(id, "searchReviewWindow");
    if (!sessionId) return;
    dispatch(openOverlay({ overlayId: "searchReviewWindow", data: { sessionId } }));
}
