import type { NewsWindowDefinitionData } from "./newsWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<NewsWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "newsWindow" }));
}
