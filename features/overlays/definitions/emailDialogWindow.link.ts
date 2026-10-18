import type { EmailDialogWindowDefinitionData } from "./emailDialogWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<EmailDialogWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "emailDialogWindow" }));
}
