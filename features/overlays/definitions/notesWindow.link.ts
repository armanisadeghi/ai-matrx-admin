import type { NotesWindowDefinitionData } from "./notesWindow.overlay";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<NotesWindowDefinitionData>) {
    dispatch(
      openOverlay({
        overlayId: "notesWindow",
        instanceId: id || "default",
        data: { title: "Notes" },
      }),
    );
}
