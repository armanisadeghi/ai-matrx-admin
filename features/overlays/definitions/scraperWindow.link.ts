import type { ScraperWindowDefinitionData } from "./scraperWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<ScraperWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "scraperWindow" }));
}
