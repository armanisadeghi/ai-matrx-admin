import type { ExecutionInspectorWindowDefinitionData } from "./executionInspectorWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<ExecutionInspectorWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "executionInspectorWindow" }));
}
