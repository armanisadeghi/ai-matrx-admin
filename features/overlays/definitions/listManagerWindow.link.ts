import type { ListManagerWindowDefinitionData } from "./listManagerWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<ListManagerWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "listManagerWindow" }));
}
