import type { SerpAnalyzerWindowDefinitionData } from "./serpAnalyzerWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<SerpAnalyzerWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "serpAnalyzerWindow" }));
}
