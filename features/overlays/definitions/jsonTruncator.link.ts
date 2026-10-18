import type { JsonTruncatorDefinitionData } from "./jsonTruncator.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<JsonTruncatorDefinitionData>) {
    dispatch(openOverlay({ overlayId: "jsonTruncator" }));
}
