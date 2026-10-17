import type { KeywordWindowDefinitionData } from "./keywordWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<KeywordWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "keywordWindow" }));
}
