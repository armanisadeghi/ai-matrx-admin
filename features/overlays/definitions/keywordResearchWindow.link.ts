import type { KeywordResearchWindowDefinitionData } from "./keywordResearchWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<KeywordResearchWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "keywordResearchWindow" }));
}
