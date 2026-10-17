import type { GalleryWindowDefinitionData } from "./galleryWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<GalleryWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "galleryWindow" }));
}
