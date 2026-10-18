import type { JsonTruncatorDefinitionData } from "./jsonTruncator.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<JsonTruncatorDefinitionData>) {
    dispatch(openOverlay({ overlayId: "jsonTruncator" }));
}
