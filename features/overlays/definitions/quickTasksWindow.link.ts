import type { QuickTasksWindowDefinitionData } from "./quickTasksWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<QuickTasksWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "quickTasksWindow" }));
}
