import type { MarkdownEditorWindowDefinitionData } from "./markdownEditorWindow.overlay";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, open }: LinkHydrateContext<MarkdownEditorWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "markdownEditorWindow" }));
}
