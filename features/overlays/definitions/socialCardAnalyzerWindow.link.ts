import type { SocialCardAnalyzerWindowDefinitionData } from "./socialCardAnalyzerWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<SocialCardAnalyzerWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "socialCardAnalyzerWindow" }));
}
