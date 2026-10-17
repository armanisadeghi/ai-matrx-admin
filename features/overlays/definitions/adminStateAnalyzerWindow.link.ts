import type { AdminStateAnalyzerWindowDefinitionData } from "./adminStateAnalyzerWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<AdminStateAnalyzerWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "adminStateAnalyzerWindow" }));
}
