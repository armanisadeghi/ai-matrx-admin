import type { KeywordResearchWindowDefinitionData } from "./keywordResearchWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<KeywordResearchWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "keywordResearchWindow" }));
}
