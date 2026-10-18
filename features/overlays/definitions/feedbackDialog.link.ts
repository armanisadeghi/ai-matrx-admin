import type { FeedbackDialogDefinitionData } from "./feedbackDialog.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<FeedbackDialogDefinitionData>) {
    dispatch(openOverlay({ overlayId: "feedbackDialog" }));
}
