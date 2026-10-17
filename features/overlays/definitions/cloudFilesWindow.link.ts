import type { CloudFilesWindowDefinitionData } from "./cloudFilesWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<CloudFilesWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "cloudFilesWindow" }));
}
