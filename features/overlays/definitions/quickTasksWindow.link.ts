import type { QuickTasksWindowDefinitionData } from "./quickTasksWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<QuickTasksWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "quickTasksWindow" }));
}
