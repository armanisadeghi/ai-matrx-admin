import type { MarkdownEditorWindowDefinitionData } from "./markdownEditorWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, open }: LinkHydrateContext<MarkdownEditorWindowDefinitionData>) {
    dispatch(openOverlay({ overlayId: "markdownEditorWindow" }));
}
