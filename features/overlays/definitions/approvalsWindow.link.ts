import type { ApprovalsWindowDefinitionData } from "./approvalsWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<ApprovalsWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "approvalsWindow" }));
}
