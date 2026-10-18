import type { SerpAnalyzerWindowDefinitionData } from "./serpAnalyzerWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<SerpAnalyzerWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "serpAnalyzerWindow" }));
}
