import type { ScraperWindowDefinitionData } from "./scraperWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<ScraperWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "scraperWindow" }));
}
