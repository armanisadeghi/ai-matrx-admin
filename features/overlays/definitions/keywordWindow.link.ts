import type { KeywordWindowDefinitionData } from "./keywordWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<KeywordWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "keywordWindow" }));
}
