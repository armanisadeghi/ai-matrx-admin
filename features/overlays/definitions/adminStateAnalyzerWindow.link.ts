import type { AdminStateAnalyzerWindowDefinitionData } from "./adminStateAnalyzerWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<AdminStateAnalyzerWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "adminStateAnalyzerWindow" }));
}
