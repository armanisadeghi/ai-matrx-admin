import type { CloudFilesWindowDefinitionData } from "./cloudFilesWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<CloudFilesWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "cloudFilesWindow" }));
}
