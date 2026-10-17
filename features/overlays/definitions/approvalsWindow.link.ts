import type { ApprovalsWindowDefinitionData } from "./approvalsWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<ApprovalsWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "approvalsWindow" }));
}
