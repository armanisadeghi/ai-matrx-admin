import type { ExecutionInspectorWindowDefinitionData } from "./executionInspectorWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<ExecutionInspectorWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "executionInspectorWindow" }));
}
